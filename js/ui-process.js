// ── PROCESS ──
function renderProcess(){
  if(!document.getElementById('process-grid')) return;
  var grid=document.getElementById('process-grid'); grid.innerHTML='';
  var hasSth=false;
  ALL_BRANCHES.forEach(function(b){
    var myI=issues.filter(function(i){return !i.confirmedResolved&&i.claimedBy&&i.claimedBy.indexOf(b)>=0;});
    if(!myI.length) return;
    hasSth=true;
    var card=document.createElement('div'); card.className='proc-card';
    var hd=document.createElement('div'); hd.className='proc-card-hd';
    if(LOGOS[b]){var img=document.createElement('img');img.src=LOGOS[b];img.style.cssText='width:24px;height:24px;border-radius:50%;object-fit:cover';hd.appendChild(img);}
    var nm=document.createElement('span');nm.className='proc-card-unit';nm.textContent=b;
    var cnt=document.createElement('span');cnt.className='proc-cnt';cnt.textContent='('+myI.length+' 題)';
    hd.appendChild(nm);hd.appendChild(cnt);card.appendChild(hd);
    myI.forEach(function(issue){
      var item=document.createElement('div'); item.className='proc-issue';
      item.onclick=(function(id,unit){return function(){openSolutionModal(id,unit);};})(issue.id,b);
      var ct=document.createElement('div');ct.className='proc-issue-content';
      ct.textContent=issue.content.length>40?issue.content.slice(0,40)+'...':issue.content;
      var sols=issue.solutions||[];
      var mySol=sols.find(function(s){return s.unit===b;});
      var mt=document.createElement('div');mt.className='proc-issue-meta';
      mt.textContent='提報：'+issue.unit+(mySol?'　✏ 已有解法':'　點擊輸入解法');
      item.appendChild(ct);item.appendChild(mt);card.appendChild(item);
    });
    grid.appendChild(card);
  });
  if(!hasSth) grid.innerHTML='<div class="empty">目前沒有分校認領問題</div>';
}

// ── SOLUTION MODAL ──
function openSolutionModal(id,claimUnit){
  activeIssueId=id; solUploadFiles=[]; solClaimUnit=claimUnit;
  var issue=issues.find(function(i){return i.id===id;});
  if(!issue) return;
  var sols=issue.solutions||[];
  var mySol=sols.find(function(s){return s.unit===claimUnit;});
  document.getElementById('sol-issue-title').textContent=issue.content.slice(0,60)+(issue.content.length>60?'...':'');
  document.getElementById('sol-unit-name').textContent=claimUnit+' 的解法';
  document.getElementById('sol-input').value=mySol?mySol.text:'';
  // Show existing files
  var existFiles=mySol?mySol.files||[]:[];
  renderExistingFiles(existFiles);
  renderSolUploadList();
  openModal('modal-solution');
}

function renderExistingFiles(files){
  var el=document.getElementById('sol-existing-files'); el.innerHTML='';
  if(!files.length) return;
  var hd=document.createElement('div');hd.style.cssText='font-size:12px;font-weight:700;color:var(--tx3);margin-bottom:6px';hd.textContent='已上傳檔案';el.appendChild(hd);
  files.forEach(function(f){
    var item=document.createElement('div'); item.className='file-item';
    var isImg=/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    var nm=document.createElement('span');nm.className='file-item-name';nm.textContent=(isImg?'🖼 ':'📎 ')+f.name;
    var acts=document.createElement('div');acts.className='file-item-actions';
    if(isImg){var pv=document.createElement('a');pv.href=f.url;pv.target='_blank';pv.className='btn btn-xs';pv.textContent='預覽';acts.appendChild(pv);}
    var dl=document.createElement('a');dl.href=f.url;dl.download=f.name;dl.className='btn btn-xs';dl.textContent='下載';acts.appendChild(dl);
    item.appendChild(nm);item.appendChild(acts);el.appendChild(item);
  });
}

function renderSolUploadList(){
  var el=document.getElementById('sol-upload-list'); el.innerHTML='';
  if(!solUploadFiles.length) return;
  var hd=document.createElement('div');hd.style.cssText='font-size:12px;font-weight:700;color:var(--tx3);margin-bottom:6px';hd.textContent='待上傳檔案（'+solUploadFiles.length+' 個）';el.appendChild(hd);
  solUploadFiles.forEach(function(f,idx){
    var item=document.createElement('div'); item.className='file-item';
    var isImg=/\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
    var nm=document.createElement('span');nm.className='file-item-name';nm.textContent=(isImg?'🖼 ':'📎 ')+f.name+' ('+Math.round(f.size/1024)+'KB)';
    var del=document.createElement('button');del.className='btn btn-xs btn-rd';del.textContent='移除';
    del.onclick=(function(i){return function(){solUploadFiles.splice(i,1);renderSolUploadList();};})(idx);
    item.appendChild(nm);item.appendChild(del);el.appendChild(item);
  });
}

function handleFileSelect(files){
  for(var i=0;i<files.length;i++){
    var f=files[i];
    if(f.size>10*1024*1024){toast(f.name+' 超過 10MB 限制','err');continue;}
    var dup=solUploadFiles.find(function(x){return x.name===f.name&&x.size===f.size;});
    if(!dup) solUploadFiles.push(f);
  }
  renderSolUploadList();
  document.getElementById('sol-file-input').value='';
}

async function saveSolution(){
  var issue=issues.find(function(i){return i.id===activeIssueId;});
  if(!issue) return;
  var solText=document.getElementById('sol-input').value.trim();
  if(!solText&&solUploadFiles.length===0){toast('請輸入解法說明或上傳檔案','err');return;}
  var btn=document.getElementById('sol-save-btn');
  btn.disabled=true; btn.textContent='儲存中...';
  try{
    var newFiles=[];
    for(var fi=0;fi<solUploadFiles.length;fi++){
      var uf=await uploadFile(solUploadFiles[fi],issue.id);
      newFiles.push(uf);
    }
    var sols=JSON.parse(JSON.stringify(issue.solutions||[]));
    var existIdx=-1;
    for(var si=0;si<sols.length;si++){if(sols[si].unit===solClaimUnit){existIdx=si;break;}}
    var existFiles=existIdx>=0?(sols[existIdx].files||[]):[];
    var solObj={unit:solClaimUnit,text:solText,files:existFiles.concat(newFiles),updatedAt:new Date().toISOString()};
    if(existIdx>=0) sols[existIdx]=solObj; else sols.push(solObj);
    issue.solutions=sols;
    await patchDB(issue.id,{solutions:sols});
    solUploadFiles=[];
    renderSolUploadList();
    renderExistingFiles(solObj.files);
    toast('解法已儲存！','ok');
    // Update pool card immediately
    renderPool(); renderProcess();
  }catch(e){toast('儲存失敗：'+e.message,'err');console.error(e);}
  btn.disabled=false; btn.textContent='儲存解法';
}

