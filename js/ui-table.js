// ── TABLE VIEW ──
var tableSort = {col:'urgency', dir:-1};
var tableFilter = {unit:'', tag:'', status:'', keyword:''};

function renderTable(){
  if(!document.getElementById('table-wrap')) return;
  // 重置搜尋和篩選
  tableFilter = {unit:'', tag:'', status:'', keyword:''};
  // 清空輸入框（若已存在）
  var kw = document.getElementById('tb-keyword');
  if(kw) kw.value = '';
  buildTableToolbar();
  buildTableData();
}

function buildTableToolbar(){
  var tb = document.getElementById('table-toolbar');
  if(!tb) return;

  // 分校選單
  var unitOpts = '<option value="">全部分校</option>';
  ALL_BRANCHES.forEach(function(b){ unitOpts += '<option value="'+b+'">'+b+'</option>'; });

  // 標籤選單
  var tagOpts = '<option value="">全部標籤</option>';
  TAGS.forEach(function(t){ tagOpts += '<option value="'+t+'">'+t+'</option>'; });

  tb.innerHTML =
    '<div class="tb-row">'
    +'<input class="tb-search" id="tb-keyword" type="search" autocomplete="new-password" name="search-'+Date.now()+'" placeholder="🔍 搜尋問題內容..." oninput="tableFilter.keyword=this.value;buildTableData()" readonly onfocus="this.removeAttribute(\'readonly\')">'
    +'<select class="tb-sel" onchange="tableFilter.unit=this.value;buildTableData()"><option value="">全部分校</option>'
    + ALL_BRANCHES.map(function(b){return '<option value="'+b+'"'+(tableFilter.unit===b?' selected':'')+'>'+b+'</option>';}).join('')
    +'</select>'
    +'<select class="tb-sel" onchange="tableFilter.tag=this.value;buildTableData()"><option value="">全部標籤</option>'
    + TAGS.map(function(t){return '<option value="'+t+'"'+(tableFilter.tag===t?' selected':'')+'>'+t+'</option>';}).join('')
    +'</select>'
    +'<select class="tb-sel" onchange="tableFilter.status=this.value;buildTableData()">'
    +'<option value="">全部狀態</option>'
    +'<option value="pending"'+(tableFilter.status==='pending'?' selected':'')+'>待處理</option>'
    +'<option value="claimed"'+(tableFilter.status==='claimed'?' selected':'')+'>認領中</option>'
    +'<option value="resolved"'+(tableFilter.status==='resolved'?' selected':'')+'>已解決</option>'
    +'</select>'
    +'<button class="btn btn-sm" style="background:var(--gn);color:#fff;white-space:nowrap" onclick="exportTableCSV()">⬇ 匯出 CSV</button>'
    +'</div>';
}

function getFilteredData(){
  return issues.filter(function(i){
    if(tableFilter.unit && i.unit !== tableFilter.unit) return false;
    if(tableFilter.tag && i.tags.indexOf(tableFilter.tag) < 0) return false;
    if(tableFilter.status === 'pending' && (i.confirmedResolved || (i.claimedBy && i.claimedBy.length))) return false;
    if(tableFilter.status === 'claimed' && (!i.claimedBy || !i.claimedBy.length || i.confirmedResolved)) return false;
    if(tableFilter.status === 'resolved' && !i.confirmedResolved) return false;
    if(tableFilter.keyword){
      var kw = tableFilter.keyword.toLowerCase();
      if(i.content.toLowerCase().indexOf(kw) < 0 && (i.keyResult||'').toLowerCase().indexOf(kw) < 0) return false;
    }
    return true;
  });
}

function buildTableData(){
  var data = getFilteredData();

  // 排序
  data.sort(function(a,b){
    var av = a[tableSort.col];
    var bv = b[tableSort.col];
    if(av === undefined) av = '';
    if(bv === undefined) bv = '';
    if(av < bv) return tableSort.dir;
    if(av > bv) return -tableSort.dir;
    return 0;
  });

  // 統計
  var total = data.length;
  var avgU = total ? (data.reduce(function(s,i){return s+i.urgency;},0)/total).toFixed(1) : '—';
  var avgI = total ? (data.reduce(function(s,i){return s+i.importance;},0)/total).toFixed(1) : '—';
  var resolved = data.filter(function(i){return i.confirmedResolved;}).length;
  var claimed = data.filter(function(i){return !i.confirmedResolved && i.claimedBy && i.claimedBy.length;}).length;
  var pending = total - resolved - claimed;
  document.getElementById('table-summary').innerHTML =
    '共 <b>'+total+'</b> 筆　'
    +'待處理 <b style="color:var(--tx)">'+pending+'</b>　'
    +'認領中 <b style="color:var(--og)">'+claimed+'</b>　'
    +'已解決 <b style="color:var(--gn)">'+resolved+'</b>　'
    +'平均緊急 <b>'+avgU+'</b>　平均重要 <b>'+avgI+'</b>';

  // 表格
  var cols = [
    {key:'unit', label:'分校', w:'120px'},
    {key:'tags', label:'標籤', w:'85px'},
    {key:'content', label:'問題內容', w:'40%'},
    {key:'keyResult', label:'需要的具體幫助', w:'30%'},
    {key:'deadline', label:'期望', w:'78px'},
    {key:'urgency', label:'急', w:'46px'},
    {key:'importance', label:'重', w:'46px'},
    {key:'status', label:'狀態', w:'68px'},
  ];

  var thead = '<tr>'+cols.map(function(c){
    var arrow = '';
    if(tableSort.col === c.key) arrow = tableSort.dir === -1 ? ' ▼' : ' ▲';
    var sortable = ['unit','urgency','importance','deadline'].indexOf(c.key) >= 0;
    return '<th style="width:'+c.w+'"'+(sortable?' class="th-sort" onclick="sortTable(\''+c.key+'\')"':'')+'>'+c.label+arrow+'</th>';
  }).join('')+'</tr>';

  var tbody = data.map(function(i){
    var status, statusCls;
    if(i.confirmedResolved){ status='已解決'; statusCls='st-resolved'; }
    else if(i.claimedBy && i.claimedBy.length){ status='認領中'; statusCls='st-claimed'; }
    else { status='待處理'; statusCls='st-pending'; }

    var tagHtml = (i.tags||[]).map(function(t){
      return '<span class="flbl" style="font-size:11px;padding:2px 6px;margin:1px;display:inline-block;background:var(--tag-'+t.replace(/[^a-zA-Z\u4e00-\u9fff]/g,'')+',var(--bg4))">'+t+'</span>';
    }).join('');

    var rowCls = i.confirmedResolved ? ' tr-resolved' : (i.urgency >= 5 ? ' tr-urgent' : '');
    var logoHtml = LOGOS[i.unit] ? '<img src="'+LOGOS[i.unit]+'" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:4px">' : '';

    return '<tr class="'+rowCls+'">'
      +'<td>'+logoHtml+i.unit+'</td>'
      +'<td>'+tagHtml+'</td>'
      +'<td class="td-content">'+i.content+'</td>'
      +'<td class="td-help">'+(i.keyResult||'—')+'</td>'
      +'<td style="text-align:center">'+(i.deadline||'—')+'</td>'
      +'<td style="text-align:center;font-weight:700;color:'+(i.urgency>=5?'var(--rd)':'var(--tx)')+'">'+i.urgency+'</td>'
      +'<td style="text-align:center;font-weight:700">'+i.importance+'</td>'
      +'<td><span class="status-badge '+statusCls+'">'+status+'</span></td>'
      +'</tr>';
  }).join('');

  if(data.length === 0){
    document.getElementById('table-wrap').innerHTML =
      '<div style="padding:60px;text-align:center;color:var(--tx3);background:var(--w);border-radius:var(--r)">'
      +'目前沒有符合條件的問題<br><span style="font-size:12px">（總資料 '+issues.length+' 筆）</span>'
      +'</div>';
  } else {
    document.getElementById('table-wrap').innerHTML =
      '<table class="issue-table"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>';
  }
}

function sortTable(col){
  if(tableSort.col === col){ tableSort.dir *= -1; }
  else { tableSort.col = col; tableSort.dir = -1; }
  buildTableData();
}

function exportTableCSV(){
  var data = getFilteredData();
  var header = ['分校','標籤','問題內容','需要的具體幫助','期望解決日期','緊急度','重要度','狀態'];
  var rows = data.map(function(i){
    var status = i.confirmedResolved ? '已解決' : (i.claimedBy && i.claimedBy.length ? '認領中' : '待處理');
    return [
      i.unit,
      (i.tags||[]).join('、'),
      '"'+i.content.replace(/"/g,'""')+'"',
      '"'+((i.keyResult||'').replace(/"/g,'""'))+'"',
      i.deadline||'',
      i.urgency,
      i.importance,
      status
    ].join(',');
  });
  var csv = '\uFEFF' + header.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '逗點問題總覽_'+new Date().toLocaleDateString('zh-TW').replace(/\//g,'')+'.csv';
  a.click();
}
