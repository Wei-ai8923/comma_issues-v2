// ── RESOLVED ──
function renderResolved(){
  renderStatsBar('resolved-stats');
  var res=issues.filter(function(i){return i.confirmedResolved;});
  var ftEl=document.getElementById('res-filters'); ftEl.innerHTML='';
  ['all'].concat(ALL_BRANCHES).forEach(function(u){
    var btn=document.createElement('button');
    btn.className='filter-btn'+(resFilter===u?' on':'');
    btn.textContent=u==='all'?'全部分校':u;
    btn.onclick=(function(unit){return function(){resFilter=unit;renderResolved();};})(u);
    ftEl.appendChild(btn);
  });
  var filtered=resFilter==='all'?res:res.filter(function(i){return i.unit===resFilter;});
  var grid=document.getElementById('res-grid'); grid.innerHTML='';
  if(!filtered.length){grid.innerHTML='<div class="empty">尚無已解決的問題</div>';return;}
  filtered.forEach(function(i){
    var card=document.createElement('div');card.className='pcard';card.style.aspectRatio='unset';
    card.onclick=(function(id){return function(){openIssueDetail(id);};})(i.id);
    var d=new Date(i.resolvedAt||i.createdAt);
    var tagsHtml=i.tags.map(function(t){var l=t==='其他'&&i.tagsCustom?i.tagsCustom:t;return '<span class="itag tc-'+t+'">'+l+'</span>';}).join('');
    var top=document.createElement('div');top.className='pcard-top';
    if(LOGOS[i.unit]){var img=document.createElement('img');img.src=LOGOS[i.unit];img.style.cssText='width:18px;height:18px;border-radius:50%;object-fit:cover';top.appendChild(img);}
    var un=document.createElement('span');un.className='pcard-unit-name';un.textContent=i.unit;top.appendChild(un);
    var ds=document.createElement('span');ds.className='pcard-date';ds.textContent=fmtDate(d)+' 解決';top.appendChild(ds);
    card.appendChild(top);
    var te=document.createElement('div');te.innerHTML=tagsHtml;te.style.margin='5px 0';card.appendChild(te);
    var ct=document.createElement('div');ct.className='pcard-content';ct.textContent=i.content;card.appendChild(ct);
    var sols=i.solutions||[];
    if(sols.length){var sd=document.createElement('div');sd.style.cssText='margin-top:6px;font-size:12px;color:var(--gn);font-weight:600';sd.textContent='✓ '+sols.length+' 個解法';card.appendChild(sd);}
    grid.appendChild(card);
  });
}

function openModal(id){document.getElementById(id).classList.add('on');}
function closeModal(id){document.getElementById(id).classList.remove('on');}

function saveSbKey(){
  var key=document.getElementById('sb-key-input').value.trim();
  if(!key){toast('請輸入 Key','err');return;}
  localStorage.setItem('ci_sb_key',key);
  SB_KEY=key; sb=supabase.createClient(SB_URL,SB_KEY);
  closeModal('modal-sb');
  document.getElementById('loading-lv').classList.remove('hide');
  loadIssues().then(function(ok){
    document.getElementById('loading-lv').classList.add('hide');
    if(ok){updateTabBadges();renderReportOverview();toast('連線成功！','ok');}
  });
}

function toast(msg,type){
  var t=document.getElementById('toast-el');
  t.textContent=msg; t.className='toast on '+(type||'');
  setTimeout(function(){t.className='toast';},3500);
}

async function init(){
  var ok=await loadIssues();
  document.getElementById('loading-lv').classList.add('hide');
  if(ok){updateTabBadges();renderReportOverview();}
}

init();

