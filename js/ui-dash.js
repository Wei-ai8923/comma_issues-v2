// ── DASHBOARD ──
function renderDash(){
  if(!document.getElementById('month-grid')) return;
  renderStatsBar('dash-stats');
  var now=new Date();
  var mg=document.getElementById('month-grid'); mg.innerHTML='';
  for(var m=0;m<12;m++){
    var mI=issues.filter(function(i){var d=new Date(i.createdAt);return d.getMonth()===m&&d.getFullYear()===curYear;});
    var mR=mI.filter(function(i){return i.confirmedResolved;}).length;
    var isCur=m===now.getMonth()&&curYear===now.getFullYear();
    var isSel=m===selMonth;
    var card=document.createElement('div');
    card.className='month-card'+(isCur?' cur':'')+(isSel?' sel':'');
    card.onclick=(function(mo){return function(){selMonth=mo;renderDash();};})(m);
    card.innerHTML=(isCur?'<div class="month-badge">本月</div>':'')
      +'<div class="month-num">'+(m+1)+'</div>'
      +'<div class="month-name">'+MONTH_NAMES[m]+'</div>'
      +'<div class="month-cnt">'+mI.length+' 題'+(mR?'・'+mR+' 解決':'')+'</div>';
    mg.appendChild(card);
  }
  var selI=issues.filter(function(i){var d=new Date(i.createdAt);return d.getMonth()===selMonth&&d.getFullYear()===curYear;});
  document.getElementById('dash-month-title').textContent=(selMonth+1)+'月份問題分析（'+selI.length+' 個）';
  drawQuadrant(selI);
  renderBranchStats();
  renderRanking();
}

function drawQuadrant(data){
  var container=document.getElementById('quad-container'); container.innerHTML='';
  var W=760,H=560,padL=72,padR=50,padT=50,padB=72;
  var iw=W-padL-padR, ih=H-padT-padB;
  var ns='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  svg.style.width='100%'; svg.style.height='auto';

  function el(tag,attrs){var e=document.createElementNS(ns,tag);Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k]);});return e;}
  function txt(t,x,y,anchor,fill,size,bold,rotate){
    var e=document.createElementNS(ns,'text');
    e.textContent=t;
    e.setAttribute('x',x); e.setAttribute('y',y);
    e.setAttribute('text-anchor',anchor||'middle');
    e.setAttribute('font-size',size||'12');
    e.setAttribute('fill',fill||'#888');
    e.setAttribute('font-family','Noto Sans TC,sans-serif');
    if(bold) e.setAttribute('font-weight','700');
    if(rotate) e.setAttribute('transform','rotate('+rotate+' '+x+' '+y+')');
    return e;
  }

  var cx=padL+iw/2, cy=padT+ih/2;

  // BG quadrants
  svg.appendChild(el('rect',{x:padL,y:padT,width:iw/2,height:ih/2,fill:'rgba(231,76,60,.06)'}));
  svg.appendChild(el('rect',{x:cx,y:padT,width:iw/2,height:ih/2,fill:'rgba(3,97,191,.06)'}));
  svg.appendChild(el('rect',{x:padL,y:cy,width:iw/2,height:ih/2,fill:'rgba(150,150,150,.04)'}));
  svg.appendChild(el('rect',{x:cx,y:cy,width:iw/2,height:ih/2,fill:'rgba(0,184,148,.05)'}));

  // Axes
  svg.appendChild(el('line',{x1:padL-12,y1:cy,x2:W-padR+18,y2:cy,stroke:'#444','stroke-width':'1.8'}));
  svg.appendChild(el('line',{x1:cx,y1:H-padB+12,x2:cx,y2:padT-18,stroke:'#444','stroke-width':'1.8'}));
  // Arrow right
  svg.appendChild(el('polygon',{points:(W-padR+18)+','+cy+' '+(W-padR+8)+','+(cy-5)+' '+(W-padR+8)+','+(cy+5),fill:'#444'}));
  // Arrow up
  svg.appendChild(el('polygon',{points:cx+','+(padT-18)+' '+(cx-5)+','+(padT-8)+' '+(cx+5)+','+(padT-8),fill:'#444'}));

  // Axis labels OUTSIDE quadrant
  // Y axis: 緊急 (top, above arrow), 不緊急 (bottom)
  svg.appendChild(txt('緊急',cx,padT-22,'middle','#e74c3c','13',true));
  svg.appendChild(txt('不緊急',cx,H-padB+36,'middle','#aaa','13',true));
  // X axis: 不重要 (left), 重要 (right, after arrow)
  svg.appendChild(txt('不重要',padL-8,cy+4,'end','#aaa','13',true));
  svg.appendChild(txt('重要',W-padR+22,cy+4,'start','#0361bf','13',true));

  // Dots: 合併同座標，圓圈依數量縮放，顯示數字
  var tooltip=document.getElementById('quad-tooltip');
  // 按座標分組
  var groups={};
  data.forEach(function(issue){
    if(issue.confirmedResolved) return;
    var key=issue.urgency+'_'+issue.importance;
    if(!groups[key]) groups[key]={issues:[],urgency:issue.urgency,importance:issue.importance};
    groups[key].issues.push(issue);
  });
  Object.keys(groups).forEach(function(key){
    var g=groups[key];
    var count=g.issues.length;
    var dotX=padL+(g.importance/5)*iw;
    var dotY=padT+((5-g.urgency)/5)*ih;
    // 半徑依數量：1個=11, 2個=14, 3+=16+
    var r=Math.min(11+Math.sqrt(count-1)*5, 28);
    // 顏色：多標籤時用最多的那個
    var tagCount={};
    g.issues.forEach(function(i){i.tags.forEach(function(t){tagCount[t]=(tagCount[t]||0)+1;});});
    var topTag=Object.keys(tagCount).sort(function(a,b){return tagCount[b]-tagCount[a];})[0]||'';
    var color=TAG_COLORS[topTag]||'#0361bf';
    // 圓圈
    var circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx',dotX); circle.setAttribute('cy',dotY);
    circle.setAttribute('r',String(r));
    circle.setAttribute('fill',color);
    circle.setAttribute('fill-opacity','0.88');
    circle.setAttribute('stroke','white'); circle.setAttribute('stroke-width','2');
    circle.style.cursor='pointer';
    // 數字（超過1個才顯示）
    if(count>1){
      var numTxt=document.createElementNS(ns,'text');
      numTxt.textContent=String(count);
      numTxt.setAttribute('x',String(dotX));
      numTxt.setAttribute('y',String(dotY+4));
      numTxt.setAttribute('text-anchor','middle');
      numTxt.setAttribute('font-size',r>18?'13':'11');
      numTxt.setAttribute('font-weight','700');
      numTxt.setAttribute('fill','#fff');
      numTxt.setAttribute('font-family','Noto Sans TC,sans-serif');
      numTxt.style.pointerEvents='none';
      svg.appendChild(circle);
      svg.appendChild(numTxt);
    } else {
      svg.appendChild(circle);
    }
    // Hover tooltip
    var allUnits=g.issues.map(function(i){return i.unit;}).join('、');
    circle.addEventListener('mouseenter',function(e){
      tooltip.innerHTML='<b>'+allUnits+'</b><br>緊急度：'+g.urgency+' / 重要性：'+g.importance+'<br>共 '+count+' 個問題';
      tooltip.style.display='block';
      tooltip.style.left=(e.clientX+14)+'px'; tooltip.style.top=(e.clientY-10)+'px';
    });
    circle.addEventListener('mousemove',function(e){
      tooltip.style.left=(e.clientX+14)+'px'; tooltip.style.top=(e.clientY-10)+'px';
    });
    circle.addEventListener('mouseleave',function(){tooltip.style.display='none';});
    // 點擊：一個直接開detail，多個開清單
    circle.addEventListener('click',(function(grpIssues){
      return function(){
        if(grpIssues.length===1){ openIssueDetail(grpIssues[0].id); return; }
        openQuadList(grpIssues);
      };
    })(g.issues));
  });

  var openData=data.filter(function(i){return !i.confirmedResolved;});
  if(!openData.length){
    var nt=document.createElementNS(ns,'text');
    nt.textContent='此月份尚無待解決問題';
    nt.setAttribute('x',W/2); nt.setAttribute('y',H/2);
    nt.setAttribute('text-anchor','middle');
    nt.setAttribute('font-size','14'); nt.setAttribute('fill','#aaa');
    svg.appendChild(nt);
  }
  container.appendChild(svg);
}


// ── BRANCH STATS ──
function renderBranchStats(){
  var grid = document.getElementById('branch-stats-grid');
  if(!grid) return;
  grid.innerHTML = '';
  ALL_BRANCHES.forEach(function(b){
    // 提出問題總數
    var submitted = issues.filter(function(i){ return i.unit === b; }).length;
    // 認領中（該分校被認領但尚未解決）
    var claiming = issues.filter(function(i){
      return !i.confirmedResolved && i.claimedBy && i.claimedBy.indexOf(b) >= 0;
    }).length;
    // 幫忙解決的問題（該分校認領 且 提出者確認有效）
    var solved = issues.filter(function(i){
      return i.confirmedResolved && i.claimedBy && i.claimedBy.indexOf(b) >= 0;
    }).length;
    // 解決率 = 已解決 / (已解決 + 認領中)
    var total = solved + claiming;
    var rate = total > 0 ? Math.round(solved / total * 100) : 0;

    var card = document.createElement('div');
    card.className = 'branch-stat-card';
    var logoHtml = LOGOS[b]
      ? '<img src="'+LOGOS[b]+'" class="bsc-logo">'
      : '<div class="bsc-logo-ph"></div>';
    card.innerHTML = logoHtml
      + '<div class="bsc-name">'+b+'</div>'
      + '<div class="bsc-row"><span class="bsc-label">提出問題</span><span class="bsc-val">'+submitted+'</span></div>'
      + '<div class="bsc-row"><span class="bsc-label">認領中</span><span class="bsc-val bsc-og">'+claiming+'</span></div>'
      + '<div class="bsc-row"><span class="bsc-label">幫助解決</span><span class="bsc-val bsc-gn">'+solved+'</span></div>'
      + '<div class="bsc-row"><span class="bsc-label">解決率</span><span class="bsc-val bsc-pu">'+(total>0?rate+'%':'—')+'</span></div>';
    grid.appendChild(card);
  });
}

// ── RANKING ──
function renderRanking(){
  var board = document.getElementById('ranking-board');
  if(!board) return;
  var stats = ALL_BRANCHES.map(function(b){
    var solved = issues.filter(function(i){
      return i.confirmedResolved && i.claimedBy && i.claimedBy.indexOf(b) >= 0;
    }).length;
    var claiming = issues.filter(function(i){
      return !i.confirmedResolved && i.claimedBy && i.claimedBy.indexOf(b) >= 0;
    }).length;
    var total = solved + claiming;
    var rate = total > 0 ? Math.round(solved / total * 100) : 0;
    return {name:b, solved:solved, claiming:claiming, rate:rate};
  });
  stats.sort(function(a,b){ return b.solved - a.solved || b.rate - a.rate; });

  var medals = ['🥇','🥈','🥉'];
  board.innerHTML = '';
  var list = document.createElement('div');
  list.className = 'ranking-list';
  stats.forEach(function(s, idx){
    var row = document.createElement('div');
    row.className = 'ranking-row' + (idx < 3 ? ' ranking-top' : '');
    var medal = idx < 3 ? '<span class="ranking-medal">'+medals[idx]+'</span>' : '<span class="ranking-num">'+(idx+1)+'</span>';
    var logoHtml = LOGOS[s.name] ? '<img src="'+LOGOS[s.name]+'" class="ranking-logo">' : '';
    row.innerHTML = medal + logoHtml
      + '<span class="ranking-name">'+s.name+'</span>'
      + '<span class="ranking-stat"><b>'+s.solved+'</b> 題解決</span>'
      + '<span class="ranking-stat bsc-pu">'+( (s.solved+s.claiming)>0 ? s.rate+'%' : '—' )+'</span>'
      + '<span class="ranking-stat bsc-og">認領中 '+s.claiming+'</span>';
    list.appendChild(row);
  });
  board.appendChild(list);
}

// ── QUAD LIST ──
function openQuadList(issueList){
  var body = document.getElementById('quad-list-body');
  if(!body) return;
  body.innerHTML = '';
  issueList.forEach(function(issue){
    var item = document.createElement('div');
    item.className = 'quad-list-item';
    var logoHtml = LOGOS[issue.unit] ? '<img src="'+LOGOS[issue.unit]+'" class="bsc-logo" style="width:28px;height:28px">' : '';
    item.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      + logoHtml
      + '<span style="font-weight:700;font-size:13px">'+issue.unit+'</span>'
      + '<span style="margin-left:auto;font-size:12px;color:var(--tx3)">緊急'+issue.urgency+' 重要'+issue.importance+'</span>'
      + '</div>'
      + '<div style="font-size:13px;color:var(--tx);line-height:1.6">'+issue.content+'</div>';
    item.style.cssText='padding:12px;border-bottom:1px solid var(--bd);cursor:pointer;';
    item.onclick=(function(id){return function(){closeModal('modal-quad-list');openIssueDetail(id);};})(issue.id);
    body.appendChild(item);
  });
  openModal('modal-quad-list');
}
