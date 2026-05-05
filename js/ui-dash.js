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

  // Dots with hover tooltip
  var tooltip=document.getElementById('quad-tooltip');
  // Count overlapping positions for jitter
  var posCount={};
  data.forEach(function(issue){
    if(issue.confirmedResolved) return;
    var key=issue.urgency+'_'+issue.importance;
    posCount[key]=(posCount[key]||0)+1;
  });
  var posIdx={};
  data.forEach(function(issue){
    if(issue.confirmedResolved) return;
    var key=issue.urgency+'_'+issue.importance;
    var total=posCount[key]||1;
    var idx=posIdx[key]||0;
    posIdx[key]=idx+1;
    var baseX=padL+(issue.importance/5)*iw;
    var baseY=padT+((5-issue.urgency)/5)*ih;
    var jitter=total>1?14:0;
    var angle=(idx/total)*Math.PI*2;
    var dotX=baseX+(total>1?Math.cos(angle)*jitter:0);
    var dotY=baseY+(total>1?Math.sin(angle)*jitter:0);
    var color=issue.tags.length?(TAG_COLORS[issue.tags[0]]||'#0361bf'):'#0361bf';
    var circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx',dotX); circle.setAttribute('cy',dotY);
    circle.setAttribute('r','11');
    circle.setAttribute('fill',color);
    circle.setAttribute('fill-opacity','0.88');
    circle.setAttribute('stroke','white'); circle.setAttribute('stroke-width','2');
    circle.style.cursor='pointer';
    // Hover: show unit, tags, urgency, importance (NOT content)
    circle.addEventListener('mouseenter',function(e){
      var tagLabel=issue.tags.map(function(t){return t==='其他'&&issue.tagsCustom?issue.tagsCustom:t;}).join('、');
      tooltip.innerHTML='<b>'+issue.unit+'</b><br>標籤：'+tagLabel+'<br>緊急度：'+issue.urgency+' / 重要性：'+issue.importance;
      tooltip.style.display='block';
      tooltip.style.left=(e.clientX+14)+'px'; tooltip.style.top=(e.clientY-10)+'px';
    });
    circle.addEventListener('mousemove',function(e){
      tooltip.style.left=(e.clientX+14)+'px'; tooltip.style.top=(e.clientY-10)+'px';
    });
    circle.addEventListener('mouseleave',function(){tooltip.style.display='none';});
    circle.addEventListener('click',(function(id){return function(){openIssueDetail(id);};})(issue.id));
    svg.appendChild(circle);
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

