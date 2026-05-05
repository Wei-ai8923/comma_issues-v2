// ── REPORT ──
function renderReportOverview(){
  renderStatsBar('report-stats');
  var groups=[
    {level:'hsjh',label:'國高中部',cls:'bgl-hsjh',branches:BRANCHES_HSJH_DATA},
    {level:'es',label:'國小部',cls:'bgl-es',branches:BRANCHES_ES_DATA}
  ];
  var container=document.getElementById('report-overview');
  container.innerHTML='';
  groups.forEach(function(g){
    var grpEl=document.createElement('div'); grpEl.className='branch-group';
    var hd=document.createElement('div'); hd.className='branch-group-hd';
    var lbl=document.createElement('span'); lbl.className='branch-group-label '+g.cls; lbl.textContent=g.label;
    hd.appendChild(lbl); grpEl.appendChild(hd);
    var cards=document.createElement('div'); cards.className='branch-cards';
    g.branches.forEach(function(b){
      var cnt=issues.filter(function(i){return i.unit===b.name&&!i.confirmedResolved;}).length;
      var card=document.createElement('div'); card.className='branch-card '+g.level;
      card.onclick=(function(name){return function(){openReportModal(name);};})(b.name);
      var dot=document.createElement('div'); dot.className='b-dot '+(cnt>0?'red':'grn'); card.appendChild(dot);
      if(LOGOS[b.name]){var img=document.createElement('img');img.src=LOGOS[b.name];card.appendChild(img);}
      else{var ph=document.createElement('div');ph.className='ph';ph.textContent='騰';card.appendChild(ph);}
      var nm=document.createElement('div');nm.className='branch-card-name';nm.textContent=b.name;card.appendChild(nm);
      var ce=document.createElement('div');ce.className='branch-card-cnt';ce.textContent=cnt>0?cnt+' 個問題':'';card.appendChild(ce);
      cards.appendChild(card);
    });
    grpEl.appendChild(cards); container.appendChild(grpEl);
  });
}

function openReportModal(unit){
  reportUnit=unit;
  document.getElementById('report-modal-unit-name').textContent=unit;
  var logoEl=document.getElementById('report-modal-logo');
  if(LOGOS[unit]){logoEl.src=LOGOS[unit];logoEl.style.display='block';}
  else logoEl.style.display='none';
  selTags=[]; urgencyVal=-1; importanceVal=-1;
  document.getElementById('f-content').value='';
  initTagChips(); clearScoreBtns('urgency'); clearScoreBtns('importance');
  renderMiniList(unit);
  openModal('modal-report');
}

function clearScoreBtns(type){
  document.querySelectorAll('.score-btn[data-type="'+type+'"]').forEach(function(b){b.classList.remove('sel');});
}

function initTagChips(){
  var row=document.getElementById('tag-row'); row.innerHTML='';
  TAGS.forEach(function(t){
    var chip=document.createElement('div');
    chip.className='tag-chip tc-'+t; chip.textContent=t;
    chip.onclick=function(){toggleTag(t,chip);};
    row.appendChild(chip);
  });
  document.getElementById('tag-other-wrap').style.display='none';
}

function toggleTag(t,chip){
  var idx=selTags.indexOf(t);
  if(idx>=0){selTags.splice(idx,1);chip.classList.remove('sel');chip.style.background='';chip.style.borderColor='';}
  else{selTags.push(t);chip.classList.add('sel');chip.style.background=TAG_COLORS[t]||'#0361bf';chip.style.borderColor=TAG_COLORS[t]||'#0361bf';}
  document.getElementById('tag-other-wrap').style.display=selTags.indexOf('其他')>=0?'block':'none';
}

function setScoreBtn(type,val){
  document.querySelectorAll('.score-btn[data-type="'+type+'"]').forEach(function(b){
    b.classList.toggle('sel',parseInt(b.dataset.val)===val);
  });
  if(type==='urgency') urgencyVal=val; else importanceVal=val;
}

function renderMiniList(unit){
  var list=issues.filter(function(i){return i.unit===unit;});
  var el=document.getElementById('report-mini-list');
  var hdEl=document.getElementById('report-mini-hd');
  if(!el||!hdEl) return;
  hdEl.textContent=unit+' 的問題清單（'+list.length+' 個）';
  if(!list.length){el.innerHTML='<div class="empty" style="padding:14px;font-size:13px">尚無問題</div>';return;}
  el.innerHTML='';
  list.forEach(function(i){
    var item=document.createElement('div'); item.className='issue-mini';
    item.onclick=(function(id){return function(){closeModal('modal-report');setTimeout(function(){openIssueDetail(id);},150);};})(i.id);
    var td=document.createElement('div'); td.className='issue-mini-tags';
    i.tags.forEach(function(t){var s=document.createElement('span');s.className='itag tc-'+t;s.textContent=t==='其他'&&i.tagsCustom?i.tagsCustom:t;td.appendChild(s);});
    item.appendChild(td);
    var ct=document.createElement('div'); ct.className='issue-mini-content';
    ct.textContent=i.content.length>50?i.content.slice(0,50)+'...':i.content; item.appendChild(ct);
    var mt=document.createElement('div'); mt.className='issue-mini-meta';
    mt.textContent=fmtDate(new Date(i.createdAt))+'　緊急'+i.urgency+'・重要'+i.importance+(i.confirmedResolved?'　✓已解決':'');
    item.appendChild(mt); el.appendChild(item);
  });
}

async function submitIssue(){
  if(!reportUnit){toast('請選擇分校','err');return;}
  if(!getSbKey()||!sb){openModal('modal-sb');return;}
  var content=document.getElementById('f-content').value.trim();
  if(!content){toast('請填寫問題內容','err');return;}
  if(selTags.length===0){toast('請選擇至少一個標籤','err');return;}
  if(urgencyVal<0){toast('請選擇緊急度','err');return;}
  if(importanceVal<0){toast('請選擇重要性','err');return;}
  var tagsCustom=selTags.indexOf('其他')>=0?document.getElementById('f-tag-other').value.trim():'';
  var btn=document.getElementById('submit-btn');
  btn.disabled=true; btn.textContent='提報中...';
  var issue={
    id:Date.now().toString(), unit:reportUnit, content:content,
    tags:selTags.slice(), tagsCustom:tagsCustom,
    urgency:urgencyVal, importance:importanceVal,
    claimedBy:[], solutions:[], confirmedBy:[],
    resolved:false, confirmedResolved:false,
    resolvedAt:null, createdAt:new Date().toISOString()
  };
  try{
    await saveIssueDB(issue);
    issues.unshift(issue);
    toast('問題已提報！','ok');
    document.getElementById('f-content').value='';
    selTags=[]; initTagChips(); clearScoreBtns('urgency'); clearScoreBtns('importance');
    urgencyVal=-1; importanceVal=-1;
    renderMiniList(reportUnit); renderReportOverview(); updateTabBadges();
  }catch(e){toast('提報失敗：'+e.message,'err');console.error(e);}
  btn.disabled=false; btn.textContent='送出問題';
}

