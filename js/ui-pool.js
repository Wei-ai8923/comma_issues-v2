// ── POOL ──
function updateTabBadges(){
  var open=issues.filter(function(i){return !i.confirmedResolved;}).length;
  var t=document.getElementById('tab-pool');
  if(t) t.textContent='問題庫'+(open?' ('+open+')':'');
  var pc=0;
  ALL_BRANCHES.forEach(function(b){
    pc+=issues.filter(function(i){return !i.confirmedResolved&&i.claimedBy&&i.claimedBy.indexOf(b)>=0;}).length;
  });
  var tp=document.getElementById('tab-process');
  if(tp) tp.textContent='問題處理區'+(pc?' ('+pc+')':'');
  var resolved=issues.filter(function(i){return i.confirmedResolved;}).length;
  var tr=document.getElementById('tab-resolved');
  if(tr) tr.textContent='已解決問題'+(resolved?' ('+resolved+')':'');
}

function renderPool(){
  if(!document.getElementById('pool-columns')) return;
  renderStatsBar('pool-stats');
  var pool=issues.filter(function(i){return !i.confirmedResolved;});
  if(poolTagFilter!=='all') pool=pool.filter(function(i){return i.tags.indexOf(poolTagFilter)>=0;});
  var ftEl=document.getElementById('pool-filters'); ftEl.innerHTML='';
  ['all'].concat(TAGS).forEach(function(t){
    var btn=document.createElement('button');
    btn.className='filter-btn'+(poolTagFilter===t?' on':'');
    btn.textContent=t==='all'?'全部':t;
    btn.onclick=(function(tag){return function(){poolTagFilter=tag;renderPool();};})(t);
    ftEl.appendChild(btn);
  });
  var colsEl=document.getElementById('pool-columns'); colsEl.innerHTML='';
  if(!pool.length){colsEl.innerHTML='<div class="empty">目前沒有待解決的問題</div>';return;}
  if(poolTagFilter!=='all'){
    colsEl.appendChild(buildPoolCol(poolTagFilter,pool));
  } else {
    var tagGroups={};
    pool.forEach(function(i){
      var assignedTags=i.tags.length?i.tags:['其他'];
      assignedTags.forEach(function(tag){
        if(!tagGroups[tag]) tagGroups[tag]=[];
        tagGroups[tag].push(i);
      });
    });
    TAGS.forEach(function(t){if(tagGroups[t]&&tagGroups[t].length)colsEl.appendChild(buildPoolCol(t,tagGroups[t]));});
  }
}

function buildPoolCol(tag,list){
  var col=document.createElement('div'); col.className='pool-col';
  var hd=document.createElement('div'); hd.className='pool-col-hd';
  hd.style.background=(TAG_COLORS[tag]||'#7f8c8d')+'18';
  hd.style.color=TAG_COLORS[tag]||'#7f8c8d';
  hd.innerHTML='<span>'+tag+'</span><span class="pool-col-cnt">'+list.length+'</span>';
  col.appendChild(hd);
  var cards=document.createElement('div'); cards.className='pool-cards';
  list.forEach(function(issue){cards.appendChild(buildPoolCard(issue));});
  col.appendChild(cards);
  return col;
}

function buildPoolCard(issue){
  var card=document.createElement('div'); card.className='pcard';
  card.onclick=(function(id){return function(){openIssueDetail(id);};})(issue.id);
  var d=new Date(issue.createdAt);
  // Top row
  var top=document.createElement('div'); top.className='pcard-top';
  var ud=document.createElement('div'); ud.className='pcard-unit';
  if(LOGOS[issue.unit]){var img=document.createElement('img');img.src=LOGOS[issue.unit];ud.appendChild(img);}
  var un=document.createElement('span'); un.className='pcard-unit-name'; un.textContent=issue.unit; ud.appendChild(un);
  top.appendChild(ud);
  var ds=document.createElement('span'); ds.className='pcard-date'; ds.textContent=fmtDate(d); top.appendChild(ds);
  card.appendChild(top);
  // Content
  var ct=document.createElement('div'); ct.className='pcard-content'; ct.textContent=issue.content; card.appendChild(ct);
  // Footer
  var ft=document.createElement('div'); ft.className='pcard-footer';
  var sc=document.createElement('span'); sc.className='pcard-scores'; sc.textContent='緊急'+issue.urgency+' 重要'+issue.importance; ft.appendChild(sc);
  if(issue.claimedBy&&issue.claimedBy.length){
    var cl=document.createElement('span'); cl.className='pcard-claimed'; cl.textContent='▶ '+issue.claimedBy.join('、')+' 認領中'; ft.appendChild(cl);
  }
  // Show solution count if any
  var sols=issue.solutions||[];
  if(sols.length){
    var sl=document.createElement('span');
    sl.style.cssText='font-size:10px;color:var(--gn);font-weight:700';
    sl.textContent='✏ '+sols.length+' 個解法'; ft.appendChild(sl);
  }
  card.appendChild(ft);
  return card;
}

// ── ISSUE DETAIL ──
function openIssueDetail(id){
  var issue=issues.find(function(i){return i.id===id;});
  if(!issue) return;
  activeIssueId=id;
  var d=new Date(issue.createdAt);
  var tagsHtml=issue.tags.map(function(t){
    var l=t==='其他'&&issue.tagsCustom?issue.tagsCustom:t;
    return '<span class="itag tc-'+t+'">'+l+'</span>';
  }).join('');

  // Solutions - with confirm button for issue owner
  var solsHtml='';
  var sols=issue.solutions||[];
  var isOwner=issue.unit===reportUnit;
  if(sols.length){
    solsHtml='<div style="margin-top:14px"><div class="flbl" style="margin-bottom:8px">解法（'+sols.length+' 個）</div>';
    sols.forEach(function(s,idx){
      var cb=issue.confirmedBy||[];
      var confirmed=cb.indexOf(idx)>=0;
      var fHtml='';
      if(s.files&&s.files.length){
        fHtml='<div class="file-list" style="margin-top:6px">';
        s.files.forEach(function(f){
          var isImg=/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
          fHtml+='<div class="file-item"><span class="file-item-name">📎 '+f.name+'</span>'
            +'<div class="file-item-actions">'
            +(isImg?'<a href="'+f.url+'" target="_blank" class="btn btn-xs">預覽</a>':'')
            +'<a href="'+f.url+'" download="'+f.name+'" class="btn btn-xs">下載</a>'
            +'</div></div>';
        });
        fHtml+='</div>';
      }
      var confirmRow='<div class="sol-confirm-row">';
      if(confirmed){
        confirmRow+='<span class="sol-confirmed-badge">✓ 已確認有效，問題已解決</span>';
      } else {
        confirmRow+='<span style="font-size:12px;color:var(--tx3)">提出方（'+issue.unit+'）確認解法有效後問題解決</span>'
          +'<button class="btn btn-gn btn-sm" onclick="confirmSolutionAndResolve('+idx+')">✓ 確認有效</button>';
      }
      confirmRow+='</div>';
      solsHtml+='<div class="sol-check-item'+(confirmed?' confirmed':'')+'">'
        +'<div class="sol-check-unit">'
        +(LOGOS[s.unit]?'<img src="'+LOGOS[s.unit]+'" style="width:18px;height:18px;border-radius:50%;object-fit:cover">':'')
        +' '+s.unit+'</div>'
        +'<div class="sol-check-text">'+s.text+'</div>'
        +fHtml+confirmRow+'</div>';
    });
    solsHtml+='</div>';
  }

  var claimedHtml='';
  if(issue.claimedBy&&issue.claimedBy.length){
    claimedHtml='<div style="margin-top:10px;font-size:13px"><b style="color:var(--bl)">認領中：</b>'+issue.claimedBy.join('、')+'</div>';
  }

  var actionBtns='';
  if(!issue.confirmedResolved){
    if(issue.claimedBy && issue.claimedBy.length > 0){
      actionBtns='<div style="margin-top:14px;padding:10px;background:var(--bg3);border-radius:var(--rs);font-size:13px;color:var(--tx2);text-align:center">▶ <b>'+issue.claimedBy[0]+'</b> 認領處理中</div>';
    } else {
      actionBtns='<button class="btn btn-gn" onclick="openClaimModal()" style="margin-top:14px;width:100%">選擇解決這題的分校</button>';
    }
  }

  document.getElementById('issue-detail-body').innerHTML=
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+tagsHtml+'</div>'
    +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
    +(LOGOS[issue.unit]?'<img src="'+LOGOS[issue.unit]+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover">':'')
    +'<b>'+issue.unit+'</b><span style="font-size:12px;color:var(--tx3);margin-left:auto">'+fmtDate(d)+'</span></div>'
    +'<div style="font-size:15px;line-height:1.7;margin-bottom:10px">'+issue.content+'</div>'
    +(issue.deadline?'<div style="margin-bottom:6px;font-size:13px"><span style="color:var(--tx3)">📅 期望解決：</span><b>'+issue.deadline+'</b></div>':'')
    +(issue.keyResult?'<div style="margin-bottom:10px;font-size:13px"><span style="color:var(--tx3)">🎯 關鍵成果：</span><b>'+issue.keyResult+'</b></div>':'')
    +'<div style="display:flex;gap:10px">'
    +'<span style="font-size:13px;background:var(--bg3);padding:4px 10px;border-radius:8px">緊急 <b>'+issue.urgency+'/5</b></span>'
    +'<span style="font-size:13px;background:var(--bg3);padding:4px 10px;border-radius:8px">重要 <b>'+issue.importance+'/5</b></span>'
    +'</div>'
    +claimedHtml+solsHtml+actionBtns;

  openModal('modal-issue-detail');
}

// ── CONFIRM SOLUTION → RESOLVE ──
async function confirmSolutionAndResolve(solIdx){
  var issue=issues.find(function(i){return i.id===activeIssueId;});
  if(!issue) return;
  var cb=Array.isArray(issue.confirmedBy)?issue.confirmedBy.slice():[];
  if(cb.indexOf(solIdx)<0) cb.push(solIdx);
  var now=new Date().toISOString();
  issue.confirmedBy=cb;
  issue.confirmedResolved=true; issue.resolved=true; issue.resolvedAt=now;
  try{
    await patchDB(issue.id,{confirmedBy:cb, confirmedResolved:true, resolved:true, resolvedAt:now});
    toast('已確認解法！問題移入已解決','ok');
    closeModal('modal-issue-detail');
    // refresh all views
    renderPool(); renderProcess(); renderResolved();
    renderReportOverview(); updateTabBadges();
    if(document.getElementById('pg-dash').classList.contains('on')) renderDash();
  }catch(e){
    toast('確認失敗：'+e.message,'err'); console.error(e);
    issue.confirmedBy=cb.slice(0,-1); issue.confirmedResolved=false; issue.resolved=false;
  }
}

// ── CLAIM ──
function openClaimModal(){
  claimSelUnit=null;
  var issue=issues.find(function(i){return i.id===activeIssueId;});
  if(!issue) return;
  var body=document.getElementById('claim-unit-body'); body.innerHTML='';
  var groups=[
    {label:'總部',cls:'bgl-hsjh',units:['芸諺','乙凡','NiNi','Sherry','珊姐']},
    {label:'國小部',cls:'bgl-es',units:['青埔翱翔校','青園展翅校','大園晨光校','快樂騰雲校','文化極光校','內壢森耀校','竹北知行校']},
    {label:'國高中部',cls:'bgl-hsjh',units:['青埔升大校','大園參天校','園中方舟校','中壢心夢想校','青埔旭日校']}
  ];
  groups.forEach(function(g){
    var grp=document.createElement('div'); grp.className='usel-group';
    var lbl=document.createElement('div'); lbl.className='usel-label '+g.cls; lbl.textContent=g.label;
    grp.appendChild(lbl);
    var grid=document.createElement('div'); grid.className='usel-grid';
    g.units.forEach(function(u){
      var card=document.createElement('div'); card.className='usel-card';
      if(LOGOS[u]){var img=document.createElement('img');img.src=LOGOS[u];card.appendChild(img);}
      else{var ph=document.createElement('div');ph.className='ph-sm';ph.textContent='騰';card.appendChild(ph);}
      var nm=document.createElement('span'); nm.textContent=u; card.appendChild(nm);
      card.onclick=function(){
        document.querySelectorAll('.usel-card').forEach(function(c){c.classList.remove('sel');});
        card.classList.add('sel'); claimSelUnit=u;
      };
      grid.appendChild(card);
    });
    grp.appendChild(grid); body.appendChild(grp);
  });
  openModal('modal-claim');
}

async function confirmClaim(){
  if(!claimSelUnit){toast('請選擇一個分校','err');return;}
  var issue=issues.find(function(i){return i.id===activeIssueId;});
  if(!issue) return;
  var btn=document.getElementById('claim-confirm-btn');
  btn.disabled=true; btn.textContent='處理中...';
  var claimed=issue.claimedBy.slice();
  if(claimed.indexOf(claimSelUnit)<0) claimed.push(claimSelUnit);
  try{
    await patchDB(issue.id,{claimedBy:claimed});
    issue.claimedBy=claimed;
    toast(claimSelUnit+' 已認領此問題','ok');
    closeModal('modal-claim');
    closeModal('modal-issue-detail');
    renderPool(); renderProcess(); updateTabBadges();
  }catch(e){toast('認領失敗：'+e.message,'err');console.error(e);}
  btn.disabled=false; btn.textContent='確認認領';
}

