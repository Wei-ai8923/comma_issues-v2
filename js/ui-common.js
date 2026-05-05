// ── NAV ──
function showPg(name){
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  document.getElementById('pg-'+name).classList.add('on');
  var t=document.getElementById('tab-'+name); if(t) t.classList.add('on');
  // Reload fresh data from DB on every tab switch
  refreshAndRender(name);
}

async function refreshAndRender(name){
  try{
    var r = await sb.from('issues').select('*').order('created_at',{ascending:false});
    if(!r.error) issues = (r.data||[]).map(mapRow);
  }catch(e){ /* use cached data */ }
  updateTabBadges();
  if(name==='report') renderReportOverview();
  if(name==='pool') renderPool();
  if(name==='process') renderProcess();
  if(name==='dash') renderDash();
  if(name==='resolved') renderResolved();
}

// ── STATS (shared) ──
function getStats(){
  var total = issues.length;
  var resolved = issues.filter(function(i){return i.confirmedResolved;}).length;
  var rate = total>0 ? Math.round(resolved/total*100) : 0;
  var open = total - resolved;
  return {total:total, resolved:resolved, rate:rate, open:open};
}

function renderStatsBar(containerId){
  var el = document.getElementById(containerId);
  if(!el) return;
  var s = getStats();
  el.innerHTML =
    '<div class="stat-card"><div class="stat-val stat-bl">'+s.total+'</div><div class="stat-lbl">總問題數</div></div>'
    +'<div class="stat-card"><div class="stat-val stat-rd">'+s.open+'</div><div class="stat-lbl">待解決</div></div>'
    +'<div class="stat-card"><div class="stat-val stat-gn">'+s.resolved+'</div><div class="stat-lbl">已解決</div></div>'
    +'<div class="stat-card"><div class="stat-val stat-pu">'+s.rate+'%</div><div class="stat-lbl">解決率</div></div>';
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


// ── CLEAR PAGE ──
async function clearPage(page){
  var labels = {
    'pool': '問題庫（所有未解決問題）',
    'process': '問題處理區（認領中的問題）',
    'dash': '所有問題資料',
    'resolved': '已解決問題'
  };
  var label = labels[page] || page;
  if(!confirm('確定要清除「' + label + '」的資料嗎？\n此操作無法復原。')) return;

  var toDelete = [];
  if(page === 'pool'){
    toDelete = issues.filter(function(i){ return !i.confirmedResolved; }).map(function(i){ return i.id; });
  } else if(page === 'process'){
    toDelete = issues.filter(function(i){ return i.claimedBy && i.claimedBy.length && !i.confirmedResolved; }).map(function(i){ return i.id; });
  } else if(page === 'dash'){
    toDelete = issues.map(function(i){ return i.id; });
  } else if(page === 'resolved'){
    toDelete = issues.filter(function(i){ return i.confirmedResolved; }).map(function(i){ return i.id; });
  }

  if(!toDelete.length){ toast('沒有可清除的資料','ok'); return; }

  var r = await sb.from('issues').delete().in('id', toDelete);
  if(r.error){ toast('清除失敗：' + r.error.message, 'err'); return; }

  issues = issues.filter(function(i){ return toDelete.indexOf(i.id) < 0; });
  toast('已清除 ' + toDelete.length + ' 筆資料', 'ok');
  renderReportOverview();
  renderPool();
  updateTabBadges();
  renderProcess();
  renderDash();
  renderResolved();
}
