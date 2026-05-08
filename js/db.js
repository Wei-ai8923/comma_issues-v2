// ── DB ──
async function loadIssues(){
  if(!getSbKey()||!sb){
    document.getElementById('loading-lv').classList.add('hide');
    openModal('modal-sb'); return false;
  }
  try{
    var r = await sb.from('issues').select('*').order('created_at',{ascending:false});
    if(r.error) throw r.error;
    issues = (r.data||[]).map(mapRow);
    return true;
  }catch(e){
    document.getElementById('loading-lv').classList.add('hide');
    toast('資料庫連線失敗：'+e.message,'err'); return false;
  }
}

function mapRow(x){
  return {
    id:x.id, unit:x.unit, content:x.content,
    tags:x.tags||[], tagsCustom:x.tags_custom||'',
    urgency:typeof x.urgency==='number'?x.urgency:0,
    importance:typeof x.importance==='number'?x.importance:0,
    deadline:x.deadline||'', keyResult:x.key_result||'',
    claimedBy:x.claimed_by||[],
    solutions:x.solutions||[],
    confirmedBy:x.confirmed_by||[],
    resolved:x.resolved||false,
    confirmedResolved:x.confirmed_resolved||false,
    resolvedAt:x.resolved_at, createdAt:x.created_at
  };
}

// saveIssueDB: only safe columns (no solutions/confirmed_by - those come later via patchDB)
async function saveIssueDB(issue){
  var r = await sb.from('issues').upsert({
    id:issue.id, unit:issue.unit, content:issue.content,
    tags:issue.tags, tags_custom:issue.tagsCustom,
    urgency:issue.urgency, importance:issue.importance,
    claimed_by:[], solutions:[], confirmed_by:[],
    deadline:issue.deadline||null, key_result:issue.keyResult||null,
    resolved:false, confirmed_resolved:false,
    resolved_at:null, created_at:issue.createdAt
  });
  if(r.error) throw r.error;
}

async function patchDB(id, fields){
  var d = {};
  if(fields.content!==undefined) d.content = fields.content;
  if(fields.deadline!==undefined) d.deadline = fields.deadline;
  if(fields.key_result!==undefined) d.key_result = fields.key_result;
  if(fields.urgency!==undefined) d.urgency = fields.urgency;
  if(fields.importance!==undefined) d.importance = fields.importance;
  if(fields.claimedBy!==undefined) d.claimed_by = fields.claimedBy;
  if(fields.solutions!==undefined) d.solutions = fields.solutions;
  if(fields.confirmedBy!==undefined) d.confirmed_by = fields.confirmedBy;
  if(fields.resolved!==undefined) d.resolved = fields.resolved;
  if(fields.confirmedResolved!==undefined) d.confirmed_resolved = fields.confirmedResolved;
  if(fields.resolvedAt!==undefined) d.resolved_at = fields.resolvedAt;
  var r = await sb.from('issues').update(d).eq('id',id);
  if(r.error) throw r.error;
}

// ── FILE UPLOAD ──
async function uploadFile(file, issueId){
  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  var path = issueId+'/'+Date.now()+'_'+safeName;
  var r = await sb.storage.from('issue-files').upload(path, file, {upsert:true});
  if(r.error) throw r.error;
  var pub = sb.storage.from('issue-files').getPublicUrl(path);
  return {name:file.name, url:pub.data.publicUrl, path:path};
}

