'use strict';
const fs=require('node:fs'),path=require('node:path'),B=require('../src/engine.js'),V=require('../src/variant-engine.js'),T=require('../src/puzzle-types.js'),G=require('./variant-geometry.js');
const out=process.env.OUT?path.resolve(process.env.OUT):path.join(__dirname,'../src/variant-puzzles.json');let pool=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')).puzzles:[];
const requested=process.env.KIND||'all',targetNormal=+(process.env.NORMAL||3),targetExtreme=+(process.env.EXTREME||2),maxAttempts=+(process.env.ATTEMPTS||12000);let seed=+(process.env.SEED||470001);
function count(kind,level){return pool.filter(p=>p.kind===kind&&p.level===level).length;}
function metrics(r){return B.metrics(r);}
function save(p){if(pool.some(x=>x.id===p.id))return;pool.push(p);fs.writeFileSync(out,JSON.stringify({version:2,puzzles:pool}));console.log('ACCEPT',p.kind,p.level,p.id,p.metrics,'ABCD',p.abcd?.cells||p.target);}
function certify(engine,givens,result,def,kind){const policies=12,routes=[result];for(let p=1;p<policies;p++){const r=engine.solve(givens,result.level||'normal',{policy:p,chainLimit:60000});if(!r.solved)return null;routes.push(r);}
 const shared=new Set(def.shared||[]),initial=engine.parse(givens),blank=engine.active.filter(i=>!initial[i]);let candidates,cells=[];
 const rate=(r,i,board=null)=>{const seq=board?r.positions.filter(j=>board.includes(j)):r.positions,den=board?blank.filter(j=>board.includes(j)).length:blank.length;return den?(seq.indexOf(i)+1)/den:0;};
 if(kind==='shuriken'){
  for(let b=0;b<4;b++){const board=def.boards[b],a=blank.filter(i=>board.includes(i)&&!shared.has(i)&&routes.every(r=>rate(r,i,board)>=.8));if(!a.length)return null;a.sort((a,b)=>result.positions.indexOf(b)-result.positions.indexOf(a));cells.push(a[0]);}
 }else{
 candidates=blank.filter(i=>routes.every(r=>rate(r,i)>=.8));if(candidates.length<4)return null;candidates.sort((a,b)=>result.positions.indexOf(b)-result.positions.indexOf(a));cells=candidates.slice(0,4).sort((a,b)=>a-b);
 if(engine.units[cells[0]].some(h=>cells.every(i=>engine.houses[h].includes(i))))return null;
 }
 const tests=[];for(let pol=0;pol<3;pol++){const s=engine.state(givens),positions=[];let loops=0;while(!cells.every(i=>s.v[i])&&loops++<1600){const a=engine.available(s,result.level||'normal',{minRank:true,max:200,chainLimit:60000});if(!a.length)return null;const score=st=>st.effects.reduce((m,e)=>m+(cells.includes(e.cell)?30:0)+(engine.peers[e.cell].some(j=>cells.includes(j))?1:0),0);a.sort((a,b)=>score(b)-score(a)||(pol===1?b.cells[0]-a.cells[0]:pol===2?b.effects.length-a.effects.length:a.cells[0]-b.cells[0]));const st=a[0];engine.apply(s,st);positions.push(...st.effects.filter(e=>e.type==='place').map(e=>e.cell));}
 if(!cells.every(i=>s.v[i]))return null;const ratios=cells.map((i,j)=>rate({positions},i,kind==='shuriken'?def.boards[j]:null));const completionRatio=positions.length/blank.length;if(completionRatio<.8)return null;tests.push({policy:pol,ratios,completionRatio});}
 return {cells,policies,threshold:.8,scope:kind==='shuriken'?'each-board':'whole-board',minimumRatios:cells.map((i,j)=>({cell:i,ratio:Math.min(...routes.map(r=>rate(r,i,kind==='shuriken'?def.boards[j]:null)))})),targetPriority:tests};
}
function minimize(en,solution,random,groups=null){const v=solution.slice(),snapshots=[];for(const i of en.def.doubleCells||[])v[i]=0;if((en.def.doubleCells||[]).length){const u=en.countSolutions(v,2,10000);if(u.count!==1||!u.complete)return null;}for(const group of B.shuffle(groups||en.active.map(i=>[i]),random)){const old=group.map(i=>v[i]);if(old.every(d=>!d))continue;group.forEach(i=>v[i]=0);const u=en.countSolutions(v,2,1200);if(u.count!==1||!u.complete)group.forEach((i,k)=>v[i]=old[k]);else if(en.active.filter(i=>v[i]).length<=en.active.length*.45)snapshots.push(v.slice());}return {puzzle:v,snapshots};}
function nextTrace(givens,level,policy=0){const s=B.state(givens),trace=[];for(let k=0;k<70;k++){const a=B.available(s,level,{minRank:true,max:400,chainLimit:90000});if(!a.length)return null;const puts=new Map();for(const st of a)for(const e of st.effects)if(e.type==='place')puts.set(e.cell+':'+e.digit,st);if(puts.size>1)return null;if(puts.size===1){const st=[...puts.values()][0];B.apply(s,st);st.after=B.hash(s);trace.push(st);return {trace,target:st.effects[0],state:s};}const st=policy===1?a.at(-1):policy>1&&a.length>1&&k%(policy+2)===0?a[1]:a[0];B.apply(s,st);st.after=B.hash(s);trace.push(st);}return null;}
function makeNext(seed){const random=B.rng(seed),raw=B.generate(seed),base=raw.puzzle.slice(),attempts=[base];let sparse=base.slice();for(const i of B.shuffle(B.parse(base).flatMap((v,i)=>v?[i]:[]),random)){sparse=sparse.slice();sparse[i]=0;attempts.push(sparse);}
 let hard=B.solve(base,'extreme',{chainLimit:90000});if(hard.solved){const s=B.state(base);for(const st of hard.trace){if(st.rank>=3)attempts.push(s.v.slice());B.apply(s,st);}}
 for(const g of attempts){let r=nextTrace(g,'normal'),level='normal';if(!r){r=nextTrace(g,'extreme');level='extreme';if(!r||!r.trace.some(t=>t.rank>=3)||nextTrace(g,'normal'))continue;}if(count('next',level)>=(level==='normal'?targetNormal:targetExtreme))continue;
 let stable=true;for(let policy=1;policy<6;policy++){const t=nextTrace(g,level,policy);if(!t||t.target.cell!==r.target.cell||t.target.digit!==r.target.digit){stable=false;break;}}if(!stable)continue;
 if(!B.verifyTrace(g,r.trace).valid)throw Error('Invalid next trace');const completions=B.countSolutions(g,2,150000);if(!completions.complete||!completions.count)continue;
 const positions=r.trace.flatMap(s=>s.effects.filter(e=>e.type==='place').map(e=>e.cell));save({id:`NP-NEXT-${seed}-${level}`,kind:'next',level,givens:g.join(''),solution:raw.solution.join(''),target:{cell:r.target.cell,digit:r.target.digit,code:T.coord(r.target.cell)+r.target.digit},trace:r.trace,metrics:metrics({trace:r.trace,positions}),verification:{uniqueAnswer:true,firstPlacementUnique:true,answerPolicies:6,completionUnique:completions.count===1,traceVerified:true},seed});return true;
 }return false;
}
if(require.main===module)for(const kind of requested==='all'?['next','costume','shuriken','consecutive','diagonal','inequality','oneOrEight','honeycomb','rounding']:[requested]){
 const started=Date.now();let attempts=0;while(attempts++<maxAttempts&&(count(kind,'normal')<targetNormal||count(kind,'extreme')<targetExtreme)){
  seed++;if(attempts%100===1)console.log('PROGRESS',kind,attempts,'normal',count(kind,'normal'),'extreme',count(kind,'extreme'),'seconds',Math.round((Date.now()-started)/1000));
  if(kind==='next'){makeNext(seed);continue;}
  const random=B.rng(seed);let def,solution,removalGroups=null;
  if(kind==='costume'){
   const near=process.env.COSTUME_NEAR===undefined?count(kind,'normal')<targetNormal:process.env.COSTUME_NEAR==='1',general=process.env.COSTUME_RANDOM_LATIN===undefined?near:process.env.COSTUME_RANDOM_LATIN==='1';solution=general?G.generalLatin(random):G.latin(random);const parts=[],keys=new Set();for(let t=0;t<30&&parts.length<3;t++){const p=near&&parts.length?G.nearbyPartitions(parts[0],solution,random).find(p=>!keys.has(p.map(a=>a.slice().sort((a,b)=>a-b).join(',')).sort().join(';'))):G.partition(random,{solution});if(!p)break;const key=p.map(a=>a.slice().sort((a,b)=>a-b).join(',')).sort().join(';');if(keys.has(key))continue;keys.add(key);parts.push(p);}if(parts.length!==3)continue;def=T.costumeDef(parts);
  }else if(kind==='shuriken'){
   const regions=G.partition(random,{fixed:G.fixedShuriken});if(!regions)continue;def=T.shurikenDef(regions);const r=G.orbitSolution(def,random);if(!r)continue;solution=r.solution;removalGroups=r.orbits;
  }else if(kind==='honeycomb'){
   def=T.honeycombDef();const completed=V.create(def).countSolutions(Array(81).fill(0),1,30000,random);if(!completed.complete||!completed.solution)continue;solution=completed.solution;
  }else if(['inequality','oneOrEight','rounding'].includes(kind)){
   solution=B.generate(seed).solution;const edges=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++){const a=r*9+c;if(c<8)edges.push({a,b:a+1});if(r<8)edges.push({a,b:a+9});}
   if(kind==='inequality'){const selected=B.shuffle(edges,random).slice(0,10+Math.floor(random()*15));def=T.inequalityDef(selected.map(e=>solution[e.a]<solution[e.b]?e:{a:e.b,b:e.a}));}
   else if(kind==='oneOrEight'){const marks=B.shuffle(T.range(81).filter(i=>solution[i]===1||solution[i]===8),random).slice(0,6+Math.floor(random()*7));def=T.oneOrEightDef(marks);}
   else{const used=new Set(),cages=[],target=8+Math.floor(random()*8);for(const e of B.shuffle(edges,random)){if(used.has(e.a)||used.has(e.b))continue;used.add(e.a);used.add(e.b);cages.push({...e,rounded:Math.round((10*solution[e.a]+solution[e.b])/10)*10});if(cages.length===target)break;}def=T.roundingDef(cages);}
  }else if(kind==='diagonal'){
   def=T.diagonalDef();const completed=V.create(def).countSolutions(Array(81).fill(0),1,80000,random);if(!completed.complete||!completed.solution)continue;solution=completed.solution;
  }else{
   solution=B.generate(seed).solution;const edges=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++){const a=r*9+c;if(c<8)edges.push({a,b:a+1,consecutive:Math.abs(solution[a]-solution[a+1])===1});if(r<8)edges.push({a,b:a+9,consecutive:Math.abs(solution[a]-solution[a+9])===1});}def=T.standardDef(edges);
  }
  const en=V.create(def),reduced=minimize(en,solution,random,removalGroups);if(!reduced)continue;const options=[reduced.puzzle,...reduced.snapshots.slice(-8).reverse()];
  for(let op=0;op<options.length;op++){
   const g=options[op],normal=en.solve(g,'normal',{chainLimit:60000});let level=normal.solved?'normal':'extreme';if(count(kind,level)>=(level==='normal'?targetNormal:targetExtreme))continue;let result=normal.solved?normal:en.solve(g,'extreme',{chainLimit:90000});if(!result.solved)continue;result.level=level;
   if(level==='extreme'&&!result.trace.some(st=>st.rank>=3))continue;const abcd=certify(en,g,result,def,kind);if(!abcd)continue;
   const proof=en.verifyTrace(g,result.trace),unique=en.countSolutions(g,2,300000);if(!proof.valid||!proof.solved||!unique.complete||unique.count!==1)throw Error('Verification failed '+kind+' seed '+seed);
   save({id:`NP-${kind.toUpperCase()}-${seed}-${op}`,kind,level,givens:g.join(''),solution:solution.join(''),definition:def,abcd,trace:result.trace,metrics:metrics(result),verification:{unique:true,solutionCount:1,complete:true,traceVerified:true,engineVersion:'3.0.0'},seed});break;
  }
 }
 console.log('FINISHED',kind,count(kind,'normal'),count(kind,'extreme'),'attempts',attempts,'seconds',Math.round((Date.now()-started)/1000));
}
module.exports={certify,nextTrace,minimize};
