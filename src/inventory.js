(function(root){
'use strict';
const T=root.PuzzleTypes||(typeof require==='function'?require('./puzzle-types.js'):null);
function played(db){return [...new Set([...(db.usedPuzzleIds||[]),...Object.values(db.sessions||{}).map(s=>s.puzzleId),...Object.values(db.tests||{}).flatMap(r=>r.questions.map(q=>q.puzzleId))])];}
function fresh(pool,db,{kind,level}){const used=new Set(played(db));return pool.filter(p=>(p.kind||'standard')===kind&&p.level===level&&!used.has(p.id));}
function needed(pool,db,{kind,level,count=1}){if(!T.TYPES[kind])throw Error('問題の種類が不明です。');return Math.max(0,count-fresh(pool,db,{kind,level}).length);}
function mark(db,ids,pool){db.usedPuzzleIds=[...new Set([...(db.usedPuzzleIds||[]),...ids])];const fingerprints=ids.map(id=>pool.find(p=>p.id===id)?.fingerprint).filter(Boolean);db.usedFingerprints=[...new Set([...(db.usedFingerprints||[]),...fingerprints])].slice(-5000);}
function compact(db,{maxCharacters=700000,maxCount=48,protectIds=[]}={}){const a=db.generatedPuzzles||[],protectedIds=new Set(protectIds);const s=db.sessions?.[db.activeId];if(s)protectedIds.add(s.puzzleId);for(const r of Object.values(db.tests||{}))if(r.status==='running')r.questions.forEach(q=>protectedIds.add(q.puzzleId));const used=new Set(played(db)),removed=new Set();let size=a.reduce((n,p)=>n+JSON.stringify(p).length,0),count=a.length;
 for(const p of a){if(size<=maxCharacters&&count<=maxCount)break;if(!used.has(p.id)||protectedIds.has(p.id))continue;removed.add(p.id);size-=JSON.stringify(p).length;count--;}
 for(const p of a){if(size<=maxCharacters&&count<=maxCount)break;if(removed.has(p.id)||protectedIds.has(p.id)||used.has(p.id))continue;removed.add(p.id);size-=JSON.stringify(p).length;count--;}
 if(!removed.size)return [];db.generatedPuzzles=a.filter(p=>!removed.has(p.id));for(const [id,s]of Object.entries(db.sessions||{}))if(removed.has(s.puzzleId))delete db.sessions[id];for(const [id,r]of Object.entries(db.tests||{}))if(r.status!=='running'&&r.questions.some(q=>removed.has(q.puzzleId))){delete db.tests[id];if(db.activeTestId===id)db.activeTestId=null;}db.usedPuzzleIds=(db.usedPuzzleIds||[]).filter(id=>!removed.has(id));return [...removed];
}
root.PuzzleInventory={played,fresh,needed,mark,compact};if(typeof module!=='undefined')module.exports=root.PuzzleInventory;
})(typeof globalThis!=='undefined'?globalThis:this);
