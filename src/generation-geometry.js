(function(root){
'use strict';
const E=root.SudokuEngine||(typeof require==='function'?require('./engine.js'):null),T=root.PuzzleTypes||(typeof require==='function'?require('./puzzle-types.js'):null);
const adj=i=>[i%6?i-1:-1,i%6<5?i+1:-1,i>=6?i-6:-1,i<30?i+6:-1].filter(i=>i>=0);
const key=a=>a.slice().sort((a,b)=>a-b).join(',');
const rectangular=a=>{const r=a.map(i=>Math.floor(i/6)),c=a.map(i=>i%6);return (Math.max(...r)-Math.min(...r)+1)*(Math.max(...c)-Math.min(...c)+1)===a.length;};
function tiles(allowed,solution=null){const set=new Set(allowed),done=new Set(),out=[];for(const root of allowed){let current=[new Set([root])];for(let size=1;size<6;size++){const next=new Map();for(const cells of current)for(const v of [...cells].flatMap(adj)){if(v<root||!set.has(v)||cells.has(v)||solution&&[...cells].some(i=>solution[i]===solution[v]))continue;const n=new Set([...cells,v]),k=key([...n]);if(!next.has(k))next.set(k,n);}current=[...next.values()];}for(const cells of current){const a=[...cells].sort((a,b)=>a-b),k=key(a);if(done.has(k)||a.every(i=>Math.floor(i/6)===Math.floor(a[0]/6))||a.every(i=>i%6===a[0]%6))continue;done.add(k);out.push(a);}}return out;}
function partition(random,{fixed=[],solution=null,forbidden=[]}={}){const free=T.range(36).filter(i=>!fixed.some(r=>r.includes(i))),freeSet=new Set(free),excluded=new Set(forbidden.map(key)),all=E.shuffle(tiles(free,solution).filter(a=>!excluded.has(key(a))),random),byCell=T.range(36).map(i=>all.filter(a=>a.includes(i)));let nodes=0;function dfs(left,parts){if(++nodes>15000)return null;if(!left.size){const regions=[...fixed,...parts];return regions.filter(r=>!rectangular(r)).length>=2?regions:null;}let options=null;for(const i of left){const a=byCell[i].filter(a=>a.every(j=>left.has(j)));if(!a.length)return null;if(!options||a.length<options.length)options=a;}for(const a of options){const next=new Set([...left].filter(i=>!a.includes(i))),r=dfs(next,[...parts,a]);if(r)return r;}return null;}return dfs(freeSet,[]);}
const fixedShuriken=[[18,19,24,25,30,31],[27,28,29,33,34,35]];
function latin(random){const rows=E.shuffle(T.range(6),random),cols=E.shuffle(T.range(6),random),ds=E.shuffle([1,2,3,4,5,6],random);return rows.flatMap(r=>cols.map(c=>ds[(r+c)%6]));}
function generalLatin(random){const v=Array(36).fill(0),rows=Array(6).fill(0),cols=Array(6).fill(0);function dfs(){let cell=-1,mask=0,best=7;for(const i of E.shuffle(T.range(36),random))if(!v[i]){const m=63&~(rows[Math.floor(i/6)]|cols[i%6]),k=E.pop(m);if(!k)return false;if(k<best){cell=i;mask=m;best=k;}}if(cell<0)return true;const r=Math.floor(cell/6),c=cell%6;for(const d of E.shuffle(T.range(6).filter(d=>mask&(1<<d)),random)){const bit=1<<d;v[cell]=d+1;rows[r]|=bit;cols[c]|=bit;if(dfs())return true;v[cell]=0;rows[r]&=~bit;cols[c]&=~bit;}return false;}return dfs()?v:null;}
function connected(a){const set=new Set(a),seen=new Set([a[0]]),todo=[a[0]];while(todo.length)for(const j of adj(todo.pop()))if(set.has(j)&&!seen.has(j)){seen.add(j);todo.push(j);}return seen.size===a.length;}
function nearbyPartitions(base,solution,random){const options=[];for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)for(const a of base[i])for(const b of base[j])if(solution[a]===solution[b]){const x=base[i].filter(k=>k!==a).concat(b),y=base[j].filter(k=>k!==b).concat(a);if(connected(x)&&connected(y))options.push(base.map((r,k)=>k===i?x:k===j?y:r.slice()));}return E.shuffle(options,random);}
const api={partition,fixedShuriken,latin,generalLatin,rectangular,adj,nearbyPartitions};
function orbitSolution(def,random){
 const active=new Set(def.active),rotate=i=>(i%13)*13+12-Math.floor(i/13),orbits=[],visited=new Set();
 for(const i of def.active)if(!visited.has(i)){const a=[i];for(let j=1;j<4;j++)a.push(rotate(a.at(-1)));a.forEach(i=>visited.add(i));orbits.push(a);}
 const houses=def.units.map(u=>u.cells),peers=Array.from({length:169},(_,i)=>[...new Set(houses.filter(h=>h.includes(i)).flat())].filter(j=>j!==i)),perm=[0,2,3,4,1,6,5],v=Array(169).fill(0);let nodes=0;
 function values(d){const a=[d];for(let k=1;k<4;k++)a.push(perm[a.at(-1)]);return a;}
 const allowed=(o,d)=>{const ds=values(d);for(let k=0;k<4;k++){const i=o[k];if(peers[i].some(j=>v[j]===ds[k]))return false;for(let l=0;l<k;l++)if(peers[i].includes(o[l])&&ds[k]===ds[l])return false;}return true;};
 function dfs(){if(++nodes>80000)return false;let best=null,ds=null;for(const o of orbits)if(!v[o[0]]){const a=[1,2,3,4,5,6].filter(d=>allowed(o,d));if(!a.length)return false;if(!ds||a.length<ds.length){best=o;ds=a;}}if(!best)return true;for(const d of E.shuffle(ds,random)){const a=values(d);best.forEach((i,k)=>v[i]=a[k]);if(dfs())return true;best.forEach(i=>v[i]=0);}return false;}
 return dfs()?{solution:v,orbits,nodes}:null;
}
api.orbitSolution=orbitSolution;root.GenerationGeometry=api;if(typeof module!=='undefined')module.exports=api;

// Only the outline and shared rectangles rotate together. The four partitions,
// completed digits and later clue removals are sampled independently.
function independentShuriken(random){const parts=[];for(let b=0;b<4;b++){let p=null;for(let attempt=0;attempt<12&&!p;attempt++){const candidate=partition(random,{fixed:fixedShuriken});if(candidate&&!parts.some(a=>a.map(key).sort().join(';')===candidate.map(key).sort().join(';')))p=candidate;}if(!p)return null;parts.push(p);}const def=T.shurikenDef(parts),V=root.VariantEngine||(typeof require==='function'?require('./variant-engine.js'):null),u=V.create(def).countSolutions(Array(169).fill(0),1,60000,random);if(!u.complete||!u.solution)return null;for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){const map=new Map();let same=true;for(let i=0;i<36;i++){const x=u.solution[def.boards[a][i]],y=u.solution[def.boards[b][i]];if(map.has(x)&&map.get(x)!==y){same=false;break;}map.set(x,y);}if(same)return null;}return {def,solution:u.solution};}
api.independentShuriken=independentShuriken;

})(typeof globalThis!=='undefined'?globalThis:this);
