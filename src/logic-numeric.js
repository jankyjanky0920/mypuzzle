(function(root){
'use strict';
const C=root.LogicCSP||(typeof require==='function'?require('./logic-csp'):null),{range,shuffle,rng}=C;
const dimensions={crossmath:[3,3],mastermind:[5,1],abcPlace:[6,6],consecutiveQuads:[7,7],building:[7,7],gardenKakuro:[11,11]},permCache={};
function permutations(a){if(a.length===0)return[[]];return a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(b=>[x,...b]));}
function perms(n){return permCache[n]??=(permutations(range(n).map(i=>i+1)));}
function arrangements(n,k){const out=[];function go(a){if(a.length===k){out.push(a);return;}for(let x=1;x<=n;x++)if(!a.includes(x))go([...a,x]);}go([]);return out;}
function seen(a){let max=0,n=0;for(const v of a)if(v>max){n++;max=v;}return n;}
function hits(a,b){const exact=a.filter((v,i)=>v===b[i]).length;return[exact,a.filter(v=>b.includes(v)).length-exact];}
function pairs(a){let n=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(Math.abs(a[i]-a[j])===1)n++;return n;}
function evalLine(a,ops){let v=a[0];for(let i=0;i<ops.length;i++)v=ops[i]==='+'?v+a[i+1]:ops[i]==='-'?v-a[i+1]:v*a[i+1];return v;}
function runs(p){const {width:w,height:h,clues:q}=p,black=new Set(q.black),out=[];for(const direction of [0,1])for(let i=0;i<w*h;i++){if(black.has(i))continue;const r=Math.floor(i/w),c=i%w,prev=direction?i-w:i-1;if((direction?r>0:c>0)&&!black.has(prev))continue;const cells=[];for(let j=i;j<w*h&&!black.has(j)&&(direction||Math.floor(j/w)===r);j+=direction?w:1)cells.push(j);if(cells.length)out.push(cells);}return out;}
function compile(p){const m=new C.Model(),{kind:k,width:w,height:h,clues:q}=p,n=w*h;
 const vals=k==='abcPlace'?[0,1,2,3]:k==='gardenKakuro'?range(10):range(k==='crossmath'||k==='mastermind'?9:w).map(i=>i+1),black=new Set(q.black||[]);
 for(let i=0;i<n;i++)m.variable(black.has(i)?[-1]:q.givens?.[i]!=null?[q.givens[i]]:vals,`${Math.floor(i/w)+1}行${i%w+1}列`);
 if(k==='crossmath'){m.allDifferent(range(9),'1〜9を1回ずつ');q.lines.forEach((l,j)=>m.table(l.cells,arrangements(9,3).filter(a=>evalLine(a,l.ops)===l.total),`式${j+1}`,'式は左から右、または上から下へ順に計算します。'));}
 else if(k==='mastermind'){m.allDifferent(range(5),'5つの数字の重複禁止');q.hints.forEach((b,j)=>{const candidates=(permCache.code??=arrangements(9,5)).filter(a=>C.eq(hits(a,b.digits),b.score));m.table(range(5),candidates,'ヒント'+(j+1)+'の★と☆','このヒントの数字の一致数と位置の一致数を満たす候補を比較します。');});}
 else if(k==='abcPlace'){const tuples=permutations([1,2,3,4,5,6]).map(a=>a.map(x=>x<=3?x:0)),unique=[...new Map(tuples.map(a=>[a.join(),a])).values()];for(let d=0;d<2;d++)for(let t=0;t<w;t++){const a=range(w).map(i=>d?i*w+t:t*w+i),edge=q.edges[d][t];m.table(a,unique.filter(b=>(!edge[0]||b.find(x=>x>0)===edge[0])&&(!edge[1]||b.findLast(x=>x>0)===edge[1])),`${d?'列':'行'}${t+1}のABC`,'A・B・Cを1回ずつ置き、枠外から最初に見える文字を合わせます。');}}
 else if(k==='gardenKakuro'){runs(p).forEach((a,j)=>{m.sum(a,q.sums[j],`区間${j+1}の合計`);for(let x=0;x<a.length;x++)for(let y=x+1;y<a.length;y++)m.pair(a[x],a[y],(u,v)=>!u||!v||u!==v,`区間${j+1}の重複禁止`);});for(let i=0;i<n;i++)if(!black.has(i))for(const j of C.neighbors(w,h,i))if(j>i&&!black.has(j))m.pair(i,j,(a,b)=>a!==0||b!==0,'空きマス同士は辺で接しない');}
 else{for(let d=0;d<2;d++)for(let t=0;t<w;t++){const a=range(w).map(i=>d?i*w+t:t*w+i);if(k==='building'){const edge=q.edges[d][t];m.table(a,perms(w).filter(b=>(!edge[0]||seen(b)===edge[0])&&(!edge[1]||seen(b.slice().reverse())===edge[1])),`${d?'列':'行'}${t+1}の見えるビル`,'手前より高いビルだけが見えます。高さを重複させず、見える数を合わせます。');}else m.allDifferent(a,`${d?'列':'行'}${t+1}の重複禁止`);}if(k==='consecutiveQuads'){for(const mark of q.marks){const i=mark.cell,a=[i,i+1,i+w,i+w+1],tuples=[];for(let x=1;x<=w;x++)for(let y=1;y<=w;y++)for(let z=1;z<=w;z++)for(let t=1;t<=w;t++){const b=[x,y,z,t],n=pairs(b);if(x!==y&&x!==z&&y!==t&&z!==t&&(mark.color==='white'?n===1:n>=2))tuples.push(b);}m.table(a,tuples,`${Math.floor(i/w)+1}行${i%w+1}列の頂点`,'白丸は連続する数字の組がちょうど1組、黒丸は2組以上です。');}}}
 return m;
}
function valid(p,a){const {kind:k,width:w,height:h,clues:q}=p;if(a.length!==w*h||a.some((v,i)=>q.givens?.[i]!=null&&q.givens[i]!==v))return false;
 if(k==='crossmath')return new Set(a).size===9&&a.every(x=>x>=1&&x<=9)&&q.lines.every(l=>evalLine(l.cells.map(i=>a[i]),l.ops)===l.total);
 if(k==='mastermind')return new Set(a).size===5&&a.every(x=>x>=1&&x<=9)&&q.hints.every(b=>C.eq(hits(a,b.digits),b.score));
 if(k==='gardenKakuro'){const black=new Set(q.black);return a.every((v,i)=>black.has(i)?v===-1:v>=0&&v<=9&&(v!==0||C.neighbors(w,h,i).every(j=>a[j]!==0)))&&runs(p).every((b,j)=>b.reduce((s,i)=>s+a[i],0)===q.sums[j]&&new Set(b.map(i=>a[i]).filter(Boolean)).size===b.filter(i=>a[i]>0).length);}
 for(let d=0;d<2;d++)for(let t=0;t<w;t++){const b=range(w).map(i=>a[d?i*w+t:t*w+i]);if(k==='abcPlace'){if(b.some(x=>x<0||x>3)||[1,2,3].some(x=>b.filter(v=>v===x).length!==1))return false;}else if(new Set(b).size!==w||b.some(x=>x<1||x>w))return false;if(q.edges){const e=q.edges[d][t],f=k==='abcPlace'?x=>x.find(v=>v>0):seen;if(e[0]&&f(b)!==e[0]||e[1]&&f(b.slice().reverse())!==e[1])return false;}}
 return k!=='consecutiveQuads'||q.marks.every(b=>{const i=b.cell,n=pairs([a[i],a[i+1],a[i+w],a[i+w+1]]);return b.color==='white'?n===1:n>=2;});
}
function make(kind,seed=1,{maxRemovals=1000}={}){const random=rng(seed),[w,h]=dimensions[kind],n=w*h,p={kind,width:w,height:h,clues:{givens:Array(n).fill(null)}},q=p.clues;let a;
 if(kind==='crossmath'){a=shuffle(range(9).map(i=>i+1),random);q.lines=[];for(let d=0;d<2;d++)for(let t=0;t<3;t++){const cells=range(3).map(i=>d?i*3+t:t*3+i),ops=range(2).map(()=>['+','-','×'][Math.floor(random()*3)]);q.lines.push({cells,ops,total:evalLine(cells.map(i=>a[i]),ops)});}if(!C.solve(compile(p)).solved)throw Error('Try another crossmath seed');}
 else if(kind==='mastermind'){a=shuffle(range(9).map(i=>i+1),random).slice(0,5);q.hints=range(12).map(()=>{const digits=shuffle(range(9).map(i=>i+1),random).slice(0,5);return{digits,score:hits(a,digits)};}).concat(range(4).map(k=>({digits:a.map((_,i)=>a[(i+k+1)%5]),score:[0,5]})));for(const hint of shuffle(q.hints,random)){const at=q.hints.indexOf(hint);q.hints.splice(at,1);if(!C.solve(compile(p),{trace:false}).solved)q.hints.splice(at,0,hint);}}
 else if(kind==='gardenKakuro'){q.black=[];a=range(n).map(i=>{const r=Math.floor(i/w),c=i%w;if(r%4===3||c%4===3){q.black.push(i);return-1;}return(r*3+c)%9+1;});const available=shuffle(range(n).filter(i=>a[i]>0),random);for(const i of available)if(random()<.23&&C.neighbors(w,h,i).every(j=>a[j]!==0))a[i]=0;q.sums=runs(p).map(b=>b.reduce((s,i)=>s+a[i],0));q.givens=a.map(v=>v>0?v:null);}
 else{const nums=shuffle(range(w).map(i=>i+1),random),rows=shuffle(range(h),random),cols=shuffle(range(w),random);a=range(n).map(i=>nums[(rows[Math.floor(i/w)]+cols[i%w])%w]);if(kind==='abcPlace'){a=a.map(x=>x<=3?x:0);}if(kind==='building'||kind==='abcPlace'){q.edges=range(2).map(d=>range(w).map(t=>{const b=range(w).map(i=>a[d?i*w+t:t*w+i]),f=kind==='abcPlace'?x=>x.find(v=>v>0):seen;return[f(b),f(b.slice().reverse())];}));}if(kind==='consecutiveQuads'){q.marks=[];for(let r=0;r<h-1;r++)for(let c=0;c<w-1;c++){const i=r*w+c,n=pairs([a[i],a[i+1],a[i+w],a[i+w+1]]);if(n)q.marks.push({cell:i,color:n===1?'white':'black'});}}q.givens=a.slice();}
 let tried=0;if(!['crossmath','mastermind'].includes(kind))for(const i of shuffle(range(n).filter(i=>q.givens[i]!=null),random)){if(tried++>=maxRemovals)break;const v=q.givens[i];q.givens[i]=null;if(!C.solve(compile(p),{trace:false}).solved)q.givens[i]=v;}
 const s=C.solve(compile(p));if(!s.solved||!valid(p,s.values)||!C.verifyTrace(compile(p),s.steps))throw Error('Numeric proof failed');return{...p,solution:s.values,proof:s.steps};
}
root.LogicNumeric={dimensions,compile,valid,make,runs,seen,hits,pairs,evalLine};if(typeof module!=='undefined')module.exports=root.LogicNumeric;
})(typeof globalThis!=='undefined'?globalThis:this);
