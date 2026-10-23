(function(root){
'use strict';
const T=root.PuzzleTypes||(typeof require==='function'?require('./puzzle-types.js'):null);
const LIMIT_SECONDS=120*60,MAX_KINDS=20,kind=p=>p.kind||'standard';
const shuffle=(values,random)=>{const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function plan(pool,{level='normal',registry=T.TYPES,playedIds=[],random=Math.random,selectedKinds=null}={}){
 const kinds=Object.keys(registry).filter(k=>registry[k].family==='number-place'&&pool.some(p=>kind(p)===k));
 if(!kinds.includes('standard'))throw Error('テストにはスタンダードナンプレが必要です。');
 const required=kinds.filter(k=>k==='standard'||registry[k].testRequired),others=shuffle(kinds.filter(k=>!required.includes(k)),random),selected=selectedKinds?selectedKinds.slice():[...required,...others.slice(0,Math.max(0,MAX_KINDS-required.length))];
 if(new Set(selected).size!==selected.length||selected.length>MAX_KINDS||selected.some(k=>!kinds.includes(k))||required.some(k=>!selected.includes(k)))throw Error('テストの種類の指定が不正です。');
 if(required.length>MAX_KINDS)throw Error('必須の種類が20種類を超えています。');
 const played=new Set(playedIds),chosen=new Set(),ids=[],counts={};
 for(const k of selected){const count=registry[k].testCount??1;if(!Number.isInteger(count)||count<1||count>100)throw Error('テストの出題数が不正です。');const eligible=pool.filter(p=>kind(p)===k&&p.level===level&&!chosen.has(p.id));
  if(eligible.length<count)throw Error(`${registry[k].name}はこの難易度で${count}問必要ですが、${eligible.length}問しか収録されていません。`);
  const options=[...shuffle(eligible.filter(p=>!played.has(p.id)),random),...shuffle(eligible.filter(p=>played.has(p.id)),random)];counts[k]=count;
  for(const p of options.slice(0,count)){chosen.add(p.id);ids.push(p.id);}
 }
 return {level,selectedKinds:selected,kindCounts:counts,puzzleIds:shuffle(ids,random),total:ids.length};
}
function createQuestion(p,mode,now=Date.now(),randomSelection=false){const E=T.model(p);return {puzzleId:p.id,mode,randomSelection,values:E.parse(p.givens),pencil:Array(E.total).fill(0),ink:[],answers:['','','',''],nextAnswer:'',nextCell:null,logs:[],elapsed:0,completed:false,completedAt:null,completedModes:{},created:now,updated:now,logicState:null};}
function createRun(pool,{level='normal',mode='digital',now=Date.now(),random=Math.random,playedIds=[],registry=T.TYPES,id=null,selectedKinds=null}={}){
 if(!['digital','analog'].includes(mode))throw Error('テストのモードが不正です。');
 const selected=plan(pool,{level,random,playedIds,registry,selectedKinds});
 return {id:id||'NT-'+now.toString(36)+'-'+Math.floor(random()*0xffffff).toString(36),version:1,level,mode,startedAt:now,deadline:now+LIMIT_SECONDS*1000,limitSeconds:LIMIT_SECONDS,status:'running',currentIndex:0,selectedKinds:selected.selectedKinds,kindCounts:selected.kindCounts,questions:selected.puzzleIds.map(id=>createQuestion(pool.find(p=>p.id===id),mode,now)),endedAt:null,result:null};
}
function remainingMs(run,now=Date.now()){return Math.max(0,Math.min(LIMIT_SECONDS*1000,run.deadline-now));}
function nextAnswer(q,p){if(q.mode==='analog')return T.parseNextAnswer(q.nextAnswer||'');const i=q.nextCell;if(!Number.isInteger(i)||i<0||i>=81||+p.givens[i]||!q.values[i])return null;return {cell:i,digit:q.values[i],text:T.coord(i)+q.values[i]};}
function isAnswered(q,p){if(kind(p)==='next')return !!nextAnswer(q,p);if(q.mode==='analog')return q.answers.length===4&&q.answers.every(v=>T.model(p).labels.includes(v));return T.model(p).active.every(i=>Number.isInteger(q.values[i])&&q.values[i]>=1&&q.values[i]<=T.model(p).n);}
function gradeQuestion(q,p,index=0){const E=T.model(p),answered=isAnswered(q,p);let correct=false,answer='',expected='',wrongCells=[],missing=0;
 if(kind(p)==='next'){const a=nextAnswer(q,p);answer=a?a.text||T.coord(a.cell)+a.digit:q.nextAnswer||'';expected=p.target.code;correct=!!a&&a.cell===p.target.cell&&a.digit===p.target.digit;missing=a?0:1;}
 else if(q.mode==='analog'){answer=q.answers.map(v=>v||'□').join('');expected=p.abcd.cells.map(i=>E.label(T.data(p).solution[i])).join('');missing=q.answers.filter(v=>!v).length;wrongCells=p.abcd.cells.filter((cell,i)=>q.answers[i]&&E.fromLabel(q.answers[i])!==T.data(p).solution[cell]);correct=answered&&q.answers.every((v,i)=>E.fromLabel(v)===T.data(p).solution[p.abcd.cells[i]]);}
 else{answer=E.toUser(q.values);expected=E.toUser(T.data(p).solution);missing=E.active.filter(i=>!q.values[i]).length;wrongCells=E.active.filter(i=>q.values[i]&&q.values[i]!==T.data(p).solution[i]);correct=answered&&!wrongCells.length;}
 return {index,puzzleId:p.id,kind:kind(p),mode:q.mode,answered,correct,state:correct?'correct':answered?'wrong':'incomplete',answer,expected,missing,wrongCells};
}
function grade(run,pool,now=Date.now()){const items=run.questions.map((q,i)=>gradeQuestion(q,pool.find(p=>p.id===q.puzzleId),i));return {total:items.length,correct:items.filter(x=>x.correct).length,answered:items.filter(x=>x.answered).length,wrong:items.filter(x=>x.state==='wrong').length,incomplete:items.filter(x=>x.state==='incomplete').length,durationSeconds:Math.max(0,Math.min(LIMIT_SECONDS,Math.floor((Math.min(now,run.deadline)-run.startedAt)/1000))),items};}
function finish(run,pool,{now=Date.now(),reason='submit'}={}){if(run.status!=='running')return run.result;const expired=reason==='time'||now>=run.deadline;run.status=expired?'expired':'submitted';run.endedAt=expired?run.deadline:Math.max(run.startedAt,now);run.result=grade(run,pool,run.endedAt);return run.result;}
function canEdit(run,pool,now=Date.now()){if(run.status!=='running')return false;if(remainingMs(run,now)<=0){finish(run,pool,{now,reason:'time'});return false;}return true;}
function validateRun(run,pool){try{
 if(!run||run.version!==1||typeof run.id!=='string'||!['normal','extreme'].includes(run.level)||!['digital','analog'].includes(run.mode)||!['running','submitted','expired'].includes(run.status)||run.limitSeconds!==LIMIT_SECONDS||!Number.isFinite(run.startedAt)||run.startedAt<=0||run.deadline-run.startedAt!==LIMIT_SECONDS*1000)return false;
 if(!Array.isArray(run.questions)||!run.questions.length||run.questions.length>250||new Set(run.questions.map(q=>q.puzzleId)).size!==run.questions.length||!Number.isInteger(run.currentIndex)||run.currentIndex<0||run.currentIndex>=run.questions.length)return false;
 const counts={};for(const q of run.questions){const p=pool.find(p=>p.id===q.puzzleId);if(!p||p.level!==run.level||q.mode!==run.mode||T.TYPES[kind(p)]?.family!=='number-place')return false;counts[kind(p)]=(counts[kind(p)]||0)+1;}
 const keys=Object.keys(counts);if(!keys.includes('standard')||keys.length>MAX_KINDS||!Array.isArray(run.selectedKinds)||new Set(run.selectedKinds).size!==keys.length||run.selectedKinds.some(k=>!keys.includes(k))||!run.kindCounts||JSON.stringify(Object.entries(counts).sort())!==JSON.stringify(Object.entries(run.kindCounts).sort()))return false;
 if(run.status==='running')return run.endedAt===null&&run.result===null;
 return Number.isFinite(run.endedAt)&&run.endedAt>=run.startedAt&&run.endedAt<=run.deadline&&(run.status!=='expired'||run.endedAt===run.deadline)&&!!run.result&&JSON.stringify(run.result)===JSON.stringify(grade(run,pool,run.endedAt));
 }catch{return false;}}
root.PracticeTest={LIMIT_SECONDS,MAX_KINDS,plan,createQuestion,createRun,remainingMs,isAnswered,gradeQuestion,grade,finish,canEdit,validateRun};if(typeof module!=='undefined')module.exports=root.PracticeTest;
})(typeof globalThis!=='undefined'?globalThis:this);
