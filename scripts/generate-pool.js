'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine.js');
const out=path.resolve(__dirname,'../src/puzzles.json');
let pool=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')).puzzles:[];
const wanted=+(process.env.COUNT||12),policies=12;
let stats={attempts:0,normal:0,extreme:0,late:0,accepted:pool.length};
const seen=new Set(pool.map(p=>p.givens));
function certify(puz,level,result){const n=result.positions.length,last=result.positions.slice(-4);if(last.length!==4||last.some(i=>puz[i]))return null;
 if(E.units[last[0]].some(h=>last.every(i=>E.houses[h].includes(i))))return null;
 const ranks=last.map(()=>[]),routes=[result];for(let p=1;p<policies;p++){const route=E.solve(puz,level,{policy:p});if(!route.solved)return null;routes.push(route);for(let j=0;j<4;j++){const rank=route.positions.indexOf(last[j])+1;ranks[j].push(rank/n);if(rank/n<.8)return null;}}
 const positions=result.positions.map((i,k)=>[i,k+1]);const tests=[];
 // Target-prioritised tie-breaking: choose currently applicable simplest steps that touch targets first.
 for(let pol=0;pol<3;pol++){
 const s=E.state(puz),steps=[];let placements=0,loops=0,when=null;
 while(s.v.includes(0)&&loops++<900){let a=E.available(s,level,{minRank:true,max:240});if(!a.length)return null;
 a.sort((a,b)=>{const score=x=>x.effects.reduce((v,e)=>v+(last.includes(e.cell)?20:0)+(E.peers[e.cell].some(j=>last.includes(j))?1:0),0);return score(b)-score(a)||(pol===1?b.cells[0]-a.cells[0]:pol===2?b.effects.length-a.effects.length:a.cells[0]-b.cells[0]);});
 const st=a[0];E.apply(s,st);placements+=st.effects.filter(e=>e.type==='place').length;steps.push(st);if(last.every(i=>s.v[i])){when=placements;break;}}
 if(when===null||when/n<.8)return null;tests.push({policy:pol,placements:when,ratio:when/n});}
 return {cells:last.slice().sort((a,b)=>a-b),referenceLastFour:last,minimumRatios:last.map((i,j)=>({cell:i,ratio:Math.min((positions.find(x=>x[0]===i)[1])/n,...ranks[j])})),policies,threshold:.8,targetPriority:tests,coverage:'12 deterministic solution policies + 3 target-priority policies; not all possible human routes'};
}
let seed=+(process.env.SEED||118100);
for(let k=0;k<30000&&pool.length<wanted;k++,seed++){
 stats.attempts++;if(k%500===0)console.log('PROGRESS',JSON.stringify(stats));const raw=E.generate(seed),normal=E.solve(raw.puzzle,'normal');let level,result;
 if(normal.solved){level='normal';result=normal;if(pool.filter(p=>p.level===level).length>=Math.ceil(wanted*.6))continue;stats.normal++;}
 else{level='extreme';if(pool.filter(p=>p.level===level).length>=Math.floor(wanted*.4))continue;result=E.solve(raw.puzzle,level);if(!result.solved)continue;stats.extreme++;}
 const metrics=E.metrics(result,raw.puzzle);if(metrics.longestDependencyChain<10)continue;if(level==='extreme'&&(!metrics.advanced||metrics.maxCascade<6))continue;
 const abcd=certify(raw.puzzle,level,result);if(!abcd)continue;stats.late++;
 const unique=E.countSolutions(raw.puzzle);if(unique.count!==1||!unique.complete)throw Error('Uniqueness failed');
 const proof=E.verifyTrace(raw.puzzle,result.trace);if(!proof.valid||!proof.solved)throw Error('Trace verification failed at '+proof.at+' seed '+seed);
 const givens=raw.puzzle.join('');if(seen.has(givens))continue;seen.add(givens);
 const p={id:`LN-${level==='normal'?'N':'X'}-${seed}`,level,givens,solution:raw.solution.join(''),seed,abcd,trace:result.trace,proofGraph:E.dependencyGraph(raw.puzzle,result.trace),metrics,verification:{unique:true,solutionCount:1,complete:true,traceVerified:true,engineVersion:E.VERSION},created:'2026-10-23'};
 pool.push(p);stats.accepted=pool.length;fs.writeFileSync(out,JSON.stringify({version:1,engineVersion:E.VERSION,puzzles:pool}));process.stdout.write(JSON.stringify({id:p.id,metrics,abcd:abcd.cells,attempts:stats.attempts,total:pool.length})+'\n');
 if(k%100===0)process.stdout.write(JSON.stringify(stats)+'\n');
}
console.log('DONE',JSON.stringify(stats),pool.length);

if(pool.length<wanted){console.error("Requested pool size not reached; accepted puzzles remain verified.");process.exitCode=1;}
