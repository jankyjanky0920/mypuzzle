/* Logic Note engine v1.0.0. No solution is supplied to the logical solver. */
(function(root){
'use strict';
const VERSION='1.0.0',ALL=511,BITS=Array.from({length:9},(_,i)=>1<<i);
const pop=m=>{let n=0;while(m){m&=m-1;n++;}return n;};
const digits=m=>BITS.flatMap((b,i)=>m&b?[i+1]:[]);
const idx=(r,c)=>r*9+c,rc=i=>`${Math.floor(i/9)+1}行${i%9+1}列`;
const houses=[];for(let r=0;r<9;r++)houses.push(Array.from({length:9},(_,c)=>idx(r,c)));
for(let c=0;c<9;c++)houses.push(Array.from({length:9},(_,r)=>idx(r,c)));
for(let b=0;b<9;b++)houses.push(Array.from({length:9},(_,j)=>idx(Math.floor(b/3)*3+Math.floor(j/3),b%3*3+j%3)));
const box=i=>18+Math.floor(i/27)*3+Math.floor(i%9/3),units=Array.from({length:81},(_,i)=>[Math.floor(i/9),9+i%9,box(i)]);
const peers=Array.from({length:81},(_,i)=>[...new Set(units[i].flatMap(h=>houses[h]))].filter(j=>i!==j).sort((a,b)=>a-b));
const sees=(a,b)=>a!==b&&units[a].some(h=>units[b].includes(h));
const hn=h=>h<9?`${h+1}行目`:h<18?`${h-8}列目`:`第${h-17}ブロック`;
const TECH={
 full:{name:'残り1マス',rank:0,description:'行・列・ブロックに残った1つの数字を入れます。'},
 nakedSingle:{name:'候補が1つ',rank:0,description:'そのマスに入る候補が1つだけです。'},
 hiddenSingle:{name:'入る場所が1つ',rank:0,description:'ある数字を置ける場所が、行・列・ブロック内で1つだけです。'},
 locked:{name:'ロックされた候補',rank:1,description:'ブロックと行・列の重なりを使って、外側の候補を消します。'},
 nakedPair:{name:'裸のペア',rank:1,description:'2マスの候補が2数字に収まると、その数字は他のマスには入りません。'},
 hiddenPair:{name:'隠れたペア',rank:1,description:'2数字の置き場所が2マスだけなら、その2マスの他の候補を消せます。'},
 nakedTriple:{name:'裸のトリプル',rank:1,description:'3マスの候補が3数字に収まることを使います。'},
 hiddenTriple:{name:'隠れたトリプル',rank:1,description:'3数字の置き場所が3マスに収まることを使います。'},
 xwing:{name:'X-Wing（二国同盟）',rank:2,description:'同じ数字の候補が2行×2列に制限される配置を使います。'},
 nakedQuad:{name:'裸のクアッド',rank:3,description:'4マスの候補が4数字に収まることを使います。'},
 hiddenQuad:{name:'隠れたクアッド',rank:3,description:'4数字の置き場所が4マスに収まることを使います。'},
 swordfish:{name:'Swordfish',rank:3,description:'同じ数字の候補が3行×3列に制限される配置を使います。'},
 xywing:{name:'XY-Wing',rank:3,description:'候補2つの軸と2つの枝を使い、両方の枝が見るマスから共通候補を消します。'},
 xyzwing:{name:'XYZ-Wing',rank:3,description:'候補3つの軸と候補2つの枝を使い、3マス共通の視野から候補を消します。'},
 wwing:{name:'W-Wing',rank:3,description:'同じ候補ペアを持つ2マスを、別の強いリンクで結びます。'},
 skyscraper:{name:'Skyscraper',rank:3,description:'平行な行または列の2つの強いリンクを、弱いリンクで結びます。'},
 kite:{name:'Two-String Kite',rank:3,description:'行と列の強いリンクをブロック内で結びます。'},
 emptyRectangle:{name:'Empty Rectangle',rank:3,description:'ブロックの候補を行側・列側に分け、外側の強いリンクにつなぎます。'},
 xychain:{name:'短いXY-Chain',rank:3,description:'候補2つのマスをつなぐ、最大7リンクの推論です。'},
 aic:{name:'短いAIC',rank:3,description:'強いリンクと弱いリンクを交互につなぐ、最大7リンクの推論です。'}
};
function parse(p){const a=typeof p==='string'?[...p].filter(c=>/[0-9.]/.test(c)).map(c=>c==='.'?0:+c):Array.from(p);if(a.length!==81||a.some(d=>!Number.isInteger(d)||d<0||d>9))throw Error('盤面は0〜9の81マスで指定してください。');return a;}
function valid(values){return houses.every(h=>{const a=h.map(i=>values[i]).filter(Boolean);return new Set(a).size===a.length;});}
function state(p){const v=parse(p);if(!valid(v))throw Error('行・列・ブロックに数字の重複があります。');const c=v.map((d,i)=>d?0:ALL&~peers[i].reduce((m,j)=>m|(v[j]?BITS[v[j]-1]:0),0));return {v,c};}
const clone=s=>({v:s.v.slice(),c:s.c.slice()});
function hash(s){let h=2166136261;for(let i=0;i<81;i++){h=Math.imul(h^s.v[i],16777619);h=Math.imul(h^s.c[i],16777619);}return (h>>>0).toString(16);}
function combinations(arr,k,fn,start=0,out=[]){if(out.length===k)return fn(out.slice());for(let x=start;x<=arr.length-(k-out.length);x++){out.push(arr[x]);if(combinations(arr,k,fn,x+1,out))return true;out.pop();}return false;}
const canonicalEffects=e=>e.map(x=>[x.cell,x.digit,x.type||'remove'].join(':')).sort().join('|');
function step(s,id,cells,effects,proof,text){return {technique:id,name:TECH[id].name,rank:TECH[id].rank,cells:[...new Set(cells)],effects,proof,text,before:hash(s),key:canonicalEffects(effects)};}
const rm=(cell,digit)=>({cell,digit,type:'remove'}),put=(cell,digit)=>({cell,digit,type:'place'});
function apply(s,st){if(st.before&&st.before!==hash(s))throw Error('手順と盤面の状態が一致しません。');for(const e of st.effects){const b=BITS[e.digit-1];if(e.type==='place'){if(s.v[e.cell]&&s.v[e.cell]!==e.digit)throw Error('数字を上書きできません。');if(!s.v[e.cell]&&!(s.c[e.cell]&b))throw Error('候補にない数字です。');s.v[e.cell]=e.digit;s.c[e.cell]=0;for(const j of peers[e.cell])if(!s.v[j])s.c[j]&=~b;}else{if(s.v[e.cell])throw Error('確定マスの候補は削除できません。');s.c[e.cell]&=~b;}}
 if(!valid(s.v)||s.c.some((m,i)=>!s.v[i]&&!m))throw Error('推論の結果に矛盾があります。');return s;}
function singles(s,emit){for(let h=0;h<27;h++){const a=houses[h].filter(i=>!s.v[i]);if(a.length===1){const i=a[0],d=digits(s.c[i])[0];if(d&&emit(step(s,'full',[i],[put(i,d)],{house:h,cell:i,digit:d},`${hn(h)}で空いているのは${rc(i)}だけです。残る数字は${d}です。`)))return true;}}
 for(let i=0;i<81;i++)if(!s.v[i]&&pop(s.c[i])===1){const d=digits(s.c[i])[0];if(emit(step(s,'nakedSingle',[i],[put(i,d)],{cell:i,digit:d},`${rc(i)}の候補は${d}だけです。`)))return true;}
 for(let h=0;h<27;h++)for(let d=1;d<=9;d++){const a=houses[h].filter(i=>s.c[i]&BITS[d-1]);if(a.length===1){const i=a[0];if(emit(step(s,'hiddenSingle',[i],[put(i,d)],{house:h,cell:i,digit:d},`${hn(h)}で${d}を置ける場所は${rc(i)}だけです。`)))return true;}}return false;}
function locked(s,emit){for(let h=0;h<27;h++)for(let d=1;d<=9;d++){const a=houses[h].filter(i=>s.c[i]&BITS[d-1]);if(a.length<2)continue;for(const t of units[a[0]]){if(t===h||(h<18&&t<18)||!a.every(i=>units[i].includes(t)))continue;const effects=houses[t].filter(i=>!houses[h].includes(i)&&(s.c[i]&BITS[d-1])).map(i=>rm(i,d));if(effects.length&&emit(step(s,'locked',a,effects,{source:h,target:t,digit:d},`${hn(h)}の${d}の候補は${hn(t)}との重なりにしかありません。そのため、${hn(t)}の重なり以外から${d}を消せます。`)))return true;}}return false;}
function subsets(s,size,hidden,emit){const id=(hidden?'hidden':'naked')+({2:'Pair',3:'Triple',4:'Quad'}[size]);for(let h=0;h<27;h++){
 const blank=houses[h].filter(i=>!s.v[i]);if(blank.length<=size)continue;
 if(hidden){const ds=digits(blank.reduce((m,i)=>m|s.c[i],0));if(combinations(ds,size,sel=>{const mask=sel.reduce((m,d)=>m|BITS[d-1],0),cells=blank.filter(i=>s.c[i]&mask);if(cells.length!==size||sel.some(d=>!cells.some(i=>s.c[i]&BITS[d-1])))return false;const effects=cells.flatMap(i=>digits(s.c[i]&~mask).map(d=>rm(i,d)));return effects.length&&emit(step(s,id,cells,effects,{house:h,cells,digits:sel,hidden:true},`${hn(h)}の${sel.join('・')}の置き場所は${cells.map(rc).join('、')}の${size}マスだけです。このマスから他の候補を消せます。`));}))return true;
 }else{const eligible=blank.filter(i=>pop(s.c[i])>=2&&pop(s.c[i])<=size);if(combinations(eligible,size,cells=>{const mask=cells.reduce((m,i)=>m|s.c[i],0);if(pop(mask)!==size)return false;const ds=digits(mask),effects=blank.filter(i=>!cells.includes(i)).flatMap(i=>digits(s.c[i]&mask).map(d=>rm(i,d)));return effects.length&&emit(step(s,id,cells,effects,{house:h,cells,digits:ds,hidden:false},`${hn(h)}の${cells.map(rc).join('、')}は、候補が${ds.join('・')}の${size}数字に収まります。他のマスからこの数字を消せます。`));}))return true;}}
 return false;}
function fish(s,size,emit){for(let orient=0;orient<2;orient++)for(let d=1;d<=9;d++){const lines=Array.from({length:9},(_,n)=>n).filter(n=>{const k=houses[n+orient*9].filter(i=>s.c[i]&BITS[d-1]).length;return k>=2&&k<=size;});if(combinations(lines,size,base=>{const cells=base.flatMap(n=>houses[n+orient*9].filter(i=>s.c[i]&BITS[d-1])),cover=[...new Set(cells.map(i=>orient?Math.floor(i/9):i%9))];if(cover.length!==size)return false;const effects=cover.flatMap(n=>houses[n+(1-orient)*9]).filter(i=>!base.includes(orient?i%9:Math.floor(i/9))&&(s.c[i]&BITS[d-1])).map(i=>rm(i,d));const id=size===2?'xwing':'swordfish';return effects.length&&emit(step(s,id,cells,effects,{orient,base,cover,digit:d},`${d}の候補が${base.map(n=>n+1).join('・')}${orient?'列':'行'}の中で${cover.map(n=>n+1).join('・')}${orient?'行':'列'}に限られます。そのため、交差する${orient?'行':'列'}の外側から${d}を消せます。`));}))return true;}return false;}
function wings(s,xyz,emit){for(let p=0;p<81;p++){if(pop(s.c[p])!==(xyz?3:2))continue;const branches=peers[p].filter(i=>pop(s.c[i])===2&&(xyz?(s.c[i]&s.c[p])===s.c[i]:pop(s.c[i]&s.c[p])===1));if(combinations(branches,2,ws=>{const [a,b]=ws;if(xyz){const common=s.c[p]&s.c[a]&s.c[b];if(pop(common)!==1||(s.c[a]|s.c[b])!==s.c[p])return false;const d=digits(common)[0],effects=peers[p].filter(i=>!ws.includes(i)&&sees(i,a)&&sees(i,b)&&(s.c[i]&common)).map(i=>rm(i,d));return effects.length&&emit(step(s,'xyzwing',[p,a,b],effects,{pivot:p,wings:ws,digit:d},`${rc(p)}を軸に${ws.map(rc).join('と')}がつながります。軸と両方の枝のどこかに${d}が入るため、3マスすべてを見るマスから${d}を消せます。`));}
 const shared=s.c[a]&s.c[b];if(pop(shared)!==1||(shared&s.c[p])||(s.c[a]|s.c[b])!==(s.c[p]|shared))return false;const d=digits(shared)[0],effects=peers[a].filter(i=>i!==p&&i!==b&&sees(i,b)&&(s.c[i]&shared)).map(i=>rm(i,d));return effects.length&&emit(step(s,'xywing',[p,a,b],effects,{pivot:p,wings:ws,digit:d},`${rc(p)}のどちらの候補を選んでも、${rc(a)}か${rc(b)}には${d}が入ります。両方の枝を見るマスから${d}を消せます。`));}))return true;}return false;}
function wwing(s,emit){const biv=s.c.flatMap((m,i)=>pop(m)===2?[i]:[]);for(let ai=0;ai<biv.length;ai++)for(let bi=ai+1;bi<biv.length;bi++){const a=biv[ai],b=biv[bi];if(s.c[a]!==s.c[b]||sees(a,b))continue;for(const d of digits(s.c[a]))for(let h=0;h<27;h++){const link=houses[h].filter(i=>s.c[i]&BITS[d-1]);if(link.length!==2||link.includes(a)||link.includes(b))continue;for(const [u,v]of[link,[link[1],link[0]]]){if(!sees(a,u)||!sees(b,v))continue;const z=digits(s.c[a]&~BITS[d-1])[0],effects=peers[a].filter(i=>sees(i,b)&&(s.c[i]&BITS[z-1])).map(i=>rm(i,z));if(effects.length&&emit(step(s,'wwing',[a,u,v,b],effects,{ends:[a,b],link:[u,v],house:h,digit:d,eliminate:z},`${rc(a)}と${rc(b)}は同じ候補ペアです。${hn(h)}の${d}の強いリンクを介して、少なくとも片方に${z}が入ると分かります。両方を見るマスから${z}を消せます。`)))return true;}}}return false;}
function emptyRectangle(s,emit){for(let h=18;h<27;h++)for(let d=1;d<=9;d++){const cells=houses[h].filter(i=>s.c[i]&BITS[d-1]);if(cells.length<3)continue;for(let rr=0;rr<3;rr++)for(let cc=0;cc<3;cc++){const r=Math.floor((h-18)/3)*3+rr,c=(h-18)%3*3+cc;if(!cells.every(i=>Math.floor(i/9)===r||i%9===c))continue;const rowGroup=cells.filter(i=>Math.floor(i/9)===r),colGroup=cells.filter(i=>i%9===c);if(!rowGroup.length||!colGroup.length)continue;
 for(let sh=0;sh<18;sh++){const l=houses[sh].filter(i=>s.c[i]&BITS[d-1]);if(l.length!==2||l.some(i=>houses[h].includes(i)))continue;for(const [a,b]of[l,[l[1],l[0]]])for(const [g,other]of[[rowGroup,colGroup],[colGroup,rowGroup]]){if(!g.every(i=>sees(i,a)))continue;const effects=peers[b].filter(i=>!cells.includes(i)&&i!==a&&other.every(j=>sees(i,j))&&(s.c[i]&BITS[d-1])).map(i=>rm(i,d));if(effects.length&&emit(step(s,'emptyRectangle',[...cells,a,b],effects,{house:h,row:r,col:c,digit:d,strongHouse:sh,link:[a,b],group:g,other},`${hn(h)}の${d}は${r+1}行側か${c+1}列側にあります。${hn(sh)}の強いリンクと組み合わせると、対象マスから${d}を除外できます。`)))return true;}}}}return false;}
// A candidate node is cell*9 + digit-1. Strong and weak links are checked explicitly.
function buildGraph(s){const nodes=[],strong=new Map(),weak=new Map();for(let i=0;i<81;i++)for(const d of digits(s.c[i])){const n=i*9+d-1;nodes.push(n);strong.set(n,new Set());weak.set(n,new Set());}
 const edge=(map,a,b)=>{map.get(a).add(b);map.get(b).add(a);};
 for(let i=0;i<81;i++){const ns=digits(s.c[i]).map(d=>i*9+d-1);for(let a=0;a<ns.length;a++)for(let b=a+1;b<ns.length;b++)edge(weak,ns[a],ns[b]);if(ns.length===2)edge(strong,ns[0],ns[1]);}
 for(let h=0;h<27;h++)for(let d=1;d<=9;d++){const ns=houses[h].filter(i=>s.c[i]&BITS[d-1]).map(i=>i*9+d-1);for(let a=0;a<ns.length;a++)for(let b=a+1;b<ns.length;b++)edge(weak,ns[a],ns[b]);if(ns.length===2)edge(strong,ns[0],ns[1]);}
 return {nodes,strong,weak};}
function chains(s,maxLinks,emit,options={}){const g=buildGraph(s);let examined=0;const limit=options.limit||180000;for(const start of g.nodes){const path=[start],visited=new Set(path);function dfs(current,depth){if(++examined>limit)return false;if(depth>=3&&depth%2===1&&current!==start){const other=g.weak.get(current),effects=[...g.weak.get(start)].filter(n=>other.has(n)&&!visited.has(n)).map(n=>rm(Math.floor(n/9),n%9+1));if(effects.length){const cells=path.map(n=>Math.floor(n/9)),ds=path.map(n=>n%9+1);let id='aic';if(new Set(ds).size===1&&depth===3){const h1=units[cells[0]].find(h=>houses[h].includes(cells[1])&&houses[h].filter(i=>s.c[i]&BITS[ds[0]-1]).length===2),h2=units[cells[2]].find(h=>houses[h].includes(cells[3])&&houses[h].filter(i=>s.c[i]&BITS[ds[0]-1]).length===2);if(h1<9&&h2<9||h1>=9&&h1<18&&h2>=9&&h2<18)id='skyscraper';else if(h1<18&&h2<18)id='kite';}else if(cells.every(i=>pop(s.c[i])===2))id='xychain';const text=path.map((n,k)=>`${rc(Math.floor(n/9))}の${n%9+1}${k<path.length-1?(k%2===0?' ＝ ':' ― '):''}`).join('');if(emit(step(s,id,cells,effects,{nodes:path.slice(),links:depth},`強いリンク（＝：少なくとも一方が真）と弱いリンク（―：同時には真にならない）を交互に追います。${text}。両端の少なくとも一方が真なので、両端と両立しない候補を消せます。`)))return true;}}
 if(depth>=maxLinks)return false;const next=(depth%2===0?g.strong:g.weak).get(current);for(const n of next){if(visited.has(n))continue;visited.add(n);path.push(n);if(dfs(n,depth+1))return true;path.pop();visited.delete(n);if(examined>limit)break;}return false;}
 if(dfs(start,0))return true;if(examined>limit)break;}if(options.stats){options.stats.examined=examined;options.stats.complete=examined<=limit;}return false;}
function available(s,level='normal',opts={}){const found=[],seen=new Set(),max=opts.max||200;const emit=st=>{const key=st.technique+':'+st.key;if(!seen.has(key)){found.push(st);seen.add(key);}return opts.first||found.length>=max;};
 const detectors=[()=>singles(s,emit),()=>locked(s,emit),()=>subsets(s,2,false,emit),()=>subsets(s,2,true,emit),()=>subsets(s,3,false,emit),()=>subsets(s,3,true,emit),()=>fish(s,2,emit)];
 if(level==='extreme')detectors.push(()=>subsets(s,4,false,emit),()=>subsets(s,4,true,emit),()=>fish(s,3,emit),()=>wings(s,false,emit),()=>wings(s,true,emit),()=>wwing(s,emit),()=>emptyRectangle(s,emit),()=>chains(s,7,emit,{limit:opts.chainLimit||180000,stats:opts.chainStats}));
 for(const detect of detectors){const stop=detect();if(stop)return found;if(opts.minRank&&found.length)return found;}return found;}
function solve(p,level='normal',opts={}){const s=Array.isArray(p)||typeof p==='string'?state(p):clone(p),trace=[],positions=[];let loops=0;while(s.v.includes(0)&&loops++<900){let candidates;if(opts.policy){candidates=available(s,level,{minRank:true,max:240,chainLimit:opts.chainLimit||180000});if(candidates.length){const min=Math.min(...candidates.map(x=>x.rank));candidates=candidates.filter(x=>x.rank===min);const pnum=opts.policy;if(pnum===1)candidates.reverse();else if(candidates.length>1 && loops%(pnum+2)===0){const take=1+((pnum+loops)%Math.min(3,candidates.length-1));candidates.unshift(candidates.splice(take,1)[0]);}}}
 else candidates=available(s,level,{first:true,chainLimit:opts.chainLimit||180000});if(!candidates.length)return {solved:false,state:s,trace,positions,reason:'allowed-techniques-stalled'};const st=candidates[0];st.sequence=trace.length+1;st.after=null;apply(s,st);st.after=hash(s);trace.push(st);for(const e of st.effects)if(e.type==='place')positions.push(e.cell);}
 return {solved:!s.v.includes(0),state:s,trace,positions,reason:s.v.includes(0)?'step-limit':null};}
function countSolutions(p,limit=2,budget=2000000){const v=parse(p);if(!valid(v))return {count:0,complete:true,nodes:0,solution:null};let count=0,nodes=0,solution=null,aborted=false;const row=Array(9).fill(0),col=Array(9).fill(0),bx=Array(9).fill(0);for(let i=0;i<81;i++)if(v[i]){const b=BITS[v[i]-1];row[Math.floor(i/9)]|=b;col[i%9]|=b;bx[box(i)-18]|=b;}
 function search(){if(++nodes>budget){aborted=true;return;}let best=-1,mask=0,min=10;for(let i=0;i<81;i++)if(!v[i]){const m=ALL&~(row[Math.floor(i/9)]|col[i%9]|bx[box(i)-18]),n=pop(m);if(!n)return;if(n<min){min=n;mask=m;best=i;if(n===1)break;}}if(best<0){count++;if(!solution)solution=v.slice();return;}const r=Math.floor(best/9),c=best%9,b=box(best)-18;for(const d of digits(mask)){const bit=BITS[d-1];v[best]=d;row[r]|=bit;col[c]|=bit;bx[b]|=bit;search();row[r]&=~bit;col[c]&=~bit;bx[b]&=~bit;v[best]=0;if(count>=limit||aborted)return;}}
 search();return {count,complete:!aborted,nodes,solution};}
function strong(s,a,b){const ca=Math.floor(a/9),cb=Math.floor(b/9),da=a%9,db=b%9;if(!(s.c[ca]&BITS[da])||!(s.c[cb]&BITS[db]))return false;if(ca===cb)return da!==db&&pop(s.c[ca])===2;if(da!==db)return false;return units[ca].some(h=>units[cb].includes(h)&&houses[h].filter(i=>s.c[i]&BITS[da]).length===2);}
function weak(s,a,b){if(a===b)return false;const ca=Math.floor(a/9),cb=Math.floor(b/9);return ca===cb||a%9===b%9&&sees(ca,cb);}
// Independent certificate checks: validate structure and exact permitted effects, not solution matching.
function verifyStep(s,st){try{if(st.before!==hash(s)||!TECH[st.technique]||!st.effects.length)return false;for(const e of st.effects)if(s.v[e.cell]||!(s.c[e.cell]&BITS[e.digit-1]))return false;const p=st.proof,id=st.technique;let allowed=[];
 if(['full','nakedSingle','hiddenSingle'].includes(id)){const i=p.cell,d=p.digit;if(id==='full'&&houses[p.house].filter(j=>!s.v[j]).length!==1)return false;if(id==='nakedSingle'&&s.c[i]!==BITS[d-1])return false;if(id!=='nakedSingle'&&(houses[p.house].filter(j=>s.c[j]&BITS[d-1]).join(',')!==String(i)))return false;allowed=[put(i,d)];}
 else if(id==='locked'){const a=houses[p.source].filter(i=>s.c[i]&BITS[p.digit-1]);if(a.length<2||p.source===p.target||p.source<18&&p.target<18||!a.every(i=>houses[p.target].includes(i)))return false;allowed=houses[p.target].filter(i=>!houses[p.source].includes(i)&&(s.c[i]&BITS[p.digit-1])).map(i=>rm(i,p.digit));}
 else if(/^(naked|hidden)(Pair|Triple|Quad)$/.test(id)){const n={Pair:2,Triple:3,Quad:4}[id.replace(/^(naked|hidden)/,'')],cells=p.cells,ds=p.digits,mask=ds.reduce((m,d)=>m|BITS[d-1],0);if(cells.length!==n||new Set(cells).size!==n||ds.length!==n||pop(mask)!==n||cells.some(i=>!houses[p.house].includes(i)||s.v[i]))return false;
 if(p.hidden){if(!ds.every(d=>houses[p.house].filter(i=>s.c[i]&BITS[d-1]).length>0)||houses[p.house].some(i=>!cells.includes(i)&&(s.c[i]&mask)))return false;allowed=cells.flatMap(i=>digits(s.c[i]&~mask).map(d=>rm(i,d)));}else{if(cells.reduce((m,i)=>m|s.c[i],0)!==mask)return false;allowed=houses[p.house].filter(i=>!cells.includes(i)).flatMap(i=>digits(s.c[i]&mask).map(d=>rm(i,d)));}}
 else if(id==='xwing'||id==='swordfish'){const n=id==='xwing'?2:3;if(p.base.length!==n||p.cover.length!==n||new Set(p.base).size!==n||new Set(p.cover).size!==n)return false;for(const line of p.base){const a=houses[line+p.orient*9].filter(i=>s.c[i]&BITS[p.digit-1]);if(a.length<2||a.length>n||a.some(i=>!p.cover.includes(p.orient?Math.floor(i/9):i%9)))return false;}allowed=p.cover.flatMap(n=>houses[n+(1-p.orient)*9]).filter(i=>!p.base.includes(p.orient?i%9:Math.floor(i/9))&&(s.c[i]&BITS[p.digit-1])).map(i=>rm(i,p.digit));}
 else if(id==='xywing'||id==='xyzwing'){const [a,b]=p.wings,q=p.pivot,z=BITS[p.digit-1];if(new Set([a,b,q]).size!==3||!sees(q,a)||!sees(q,b)||pop(s.c[a])!==2||pop(s.c[b])!==2||pop(s.c[q])!==(id==='xywing'?2:3))return false;if(id==='xywing'){if((s.c[a]&s.c[b])!==z||(s.c[q]&z)||((s.c[a]|s.c[b])!==(s.c[q]|z)))return false;}else if((s.c[q]&s.c[a]&s.c[b])!==z||(s.c[a]|s.c[b])!==s.c[q])return false;allowed=peers[a].filter(i=>i!==q&&i!==b&&sees(i,b)&&(id==='xywing'||sees(i,q))&&(s.c[i]&z)).map(i=>rm(i,p.digit));}
 else if(id==='wwing'){const [a,b]=p.ends,[u,v]=p.link,d=p.digit,z=p.eliminate;if(pop(s.c[a])!==2||s.c[a]!==s.c[b]||!(s.c[a]&BITS[d-1])||!(s.c[a]&BITS[z-1])||d===z||!sees(a,u)||!sees(b,v)||!strong(s,u*9+d-1,v*9+d-1))return false;allowed=peers[a].filter(i=>sees(i,b)&&(s.c[i]&BITS[z-1])).map(i=>rm(i,z));}
 else if(id==='emptyRectangle'){const cells=houses[p.house].filter(i=>s.c[i]&BITS[p.digit-1]),[a,b]=p.link;if(p.house<18||cells.length<3||!cells.every(i=>Math.floor(i/9)===p.row||i%9===p.col)||!strong(s,a*9+p.digit-1,b*9+p.digit-1)||[a,b].some(i=>houses[p.house].includes(i)))return false;const union=new Set([...p.group,...p.other]);if(cells.some(i=>!union.has(i))||[...union].some(i=>!cells.includes(i))||!p.group.length||!p.other.length||!p.group.every(i=>sees(i,a)))return false;allowed=peers[b].filter(i=>!cells.includes(i)&&i!==a&&p.other.every(j=>sees(i,j))&&(s.c[i]&BITS[p.digit-1])).map(i=>rm(i,p.digit));}
 else if(['aic','xychain','skyscraper','kite'].includes(id)){const ns=p.nodes;if(ns.length<4||ns.length>8||ns.length%2!==0||new Set(ns).size!==ns.length)return false;for(let k=0;k<ns.length;k++)if(!(s.c[Math.floor(ns[k]/9)]&BITS[ns[k]%9]))return false;for(let k=0;k<ns.length-1;k++)if(!(k%2===0?strong(s,ns[k],ns[k+1]):weak(s,ns[k],ns[k+1])))return false;for(let i=0;i<81;i++)for(const d of digits(s.c[i])){const n=i*9+d-1;if(!ns.includes(n)&&weak(s,n,ns[0])&&weak(s,n,ns[ns.length-1]))allowed.push(rm(i,d));}}
 else return false;return st.effects.every(e=>allowed.some(a=>a.cell===e.cell&&a.digit===e.digit&&a.type===e.type));}catch{return false;}}
function verifyTrace(p,trace){const s=state(p);for(let k=0;k<trace.length;k++){if(!verifyStep(s,trace[k]))return {valid:false,at:k};apply(s,trace[k]);if(trace[k].after&&hash(s)!==trace[k].after)return {valid:false,at:k};}return {valid:true,solved:!s.v.includes(0),state:s};}
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296;};}
const shuffle=(a,random)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function completed(random){const rows=shuffle([0,1,2],random).flatMap(b=>shuffle([0,1,2],random).map(r=>b*3+r)),cols=shuffle([0,1,2],random).flatMap(b=>shuffle([0,1,2],random).map(c=>b*3+c)),ds=shuffle([1,2,3,4,5,6,7,8,9],random);let v=rows.flatMap(r=>cols.map(c=>ds[(r*3+Math.floor(r/3)+c)%9])); // randomized validity-preserving seed; randomized trades diversify structure
 for(let pass=0;pass<60;pass++){const r1=Math.floor(random()*9),r2=Math.floor(random()*9);if(r1===r2)continue;const cs=shuffle(Array.from({length:9},(_,i)=>i),random);for(let a=0;a<8;a++)for(let b=a+1;b<9;b++){const c1=cs[a],c2=cs[b],a1=idx(r1,c1),a2=idx(r1,c2),b1=idx(r2,c1),b2=idx(r2,c2);if(v[a1]!==v[b2]||v[a2]!==v[b1])continue;const copy=v.slice();[copy[a1],copy[a2]]=[copy[a2],copy[a1]];[copy[b1],copy[b2]]=[copy[b2],copy[b1]];if(valid(copy))v=copy;}}
 return v;}
function generate(seed,opts={}){const random=rng(seed),solution=completed(random),v=solution.slice();for(const i of shuffle(Array.from({length:81},(_,i)=>i),random)){const old=v[i];v[i]=0;const u=countSolutions(v);if(!u.complete||u.count!==1)v[i]=old;}return {puzzle:v,solution,seed};}
function dependencyGraph(p,trace){
 const s=state(p),removed=Array.from({length:81},()=>Array(9).fill(0)),placed=Array(81).fill(0),nodes=[];
 for(let k=0;k<trace.length;k++){
  const st=trace[k],pr=st.proof,id=st.technique,deps=new Set();
  const absent=(i,d)=>{if(!(s.c[i]&BITS[d-1])&&removed[i][d-1])deps.add(removed[i][d-1]);};
  const maskPremise=(i,mask)=>{for(let d=1;d<=9;d++)if(!(mask&BITS[d-1]))absent(i,d);};
  const housePremise=(h,d,except=[])=>{for(const i of houses[h])if(!except.includes(i))absent(i,d);};
  if(id==='full'){for(const i of houses[pr.house])if(placed[i])deps.add(placed[i]);}
  else if(id==='nakedSingle')maskPremise(pr.cell,BITS[pr.digit-1]);
  else if(id==='hiddenSingle')housePremise(pr.house,pr.digit,[pr.cell]);
  else if(id==='locked')housePremise(pr.source,pr.digit,houses[pr.target]);
  else if(/^(naked|hidden)(Pair|Triple|Quad)$/.test(id)){
   const m=pr.digits.reduce((m,d)=>m|BITS[d-1],0);
   if(pr.hidden)for(const d of pr.digits)housePremise(pr.house,d,pr.cells);else for(const i of pr.cells)maskPremise(i,m);
  }else if(id==='xwing'||id==='swordfish'){
   for(const line of pr.base)housePremise(line+pr.orient*9,pr.digit,houses[line+pr.orient*9].filter(i=>pr.cover.includes(pr.orient?Math.floor(i/9):i%9)));
  }else if(id==='xywing'||id==='xyzwing'){
   for(const i of [pr.pivot,...pr.wings])maskPremise(i,s.c[i]);
  }else if(id==='wwing'){
   for(const i of pr.ends)maskPremise(i,s.c[i]);housePremise(pr.house,pr.digit,pr.link);
  }else if(id==='emptyRectangle'){
   housePremise(pr.house,pr.digit,[...pr.group,...pr.other]);housePremise(pr.strongHouse,pr.digit,pr.link);
  }else if(pr.nodes){
   for(let t=0;t<pr.nodes.length-1;t+=2){const a=pr.nodes[t],b=pr.nodes[t+1],ca=Math.floor(a/9),cb=Math.floor(b/9),d=a%9+1;if(ca===cb)maskPremise(ca,BITS[a%9]|BITS[b%9]);else{const h=units[ca].find(h=>houses[h].includes(cb)&&houses[h].filter(i=>s.c[i]&BITS[d-1]).length===2);if(h!==undefined)housePremise(h,d,[ca,cb]);}}
  }
  const depth=1+Math.max(0,...[...deps].map(n=>nodes[n-1].depth));
  nodes.push({id:k+1,dependencies:[...deps].sort((a,b)=>a-b),depth,technique:id});
  const before=s.c.slice();apply(s,st);
  for(let i=0;i<81;i++)for(let d=1;d<=9;d++)if((before[i]&BITS[d-1])&&!(s.c[i]&BITS[d-1]))removed[i][d-1]=k+1;
  for(const e of st.effects)if(e.type==='place')placed[e.cell]=k+1;
 }
 return nodes;
}
function metrics(result,p){let advanced=0,bursts=[],run=0,started=true;for(const st of result.trace){if(st.rank>=1){if(started)bursts.push(run);run=0;started=true;if(st.rank>=3)advanced++;}else if(started)run+=st.effects.filter(e=>e.type==='place').length;}if(started)bursts.push(run);return {steps:result.trace.length,placements:result.positions.length,advanced,hardest:Math.max(0,...result.trace.map(t=>t.rank)),maxCascade:Math.max(0,...bursts),techniques:[...new Set(result.trace.map(s=>s.technique))],...(p?{longestDependencyChain:Math.max(0,...dependencyGraph(p,result.trace).map(n=>n.depth))}:{})};}
root.SudokuEngine={VERSION,ALL,BITS,pop,digits,houses,units,peers,sees,rc,hn,box,TECH,parse,state,clone,hash,apply,available,solve,countSolutions,verifyStep,verifyTrace,generate,rng,shuffle,dependencyGraph,metrics};if(typeof module!=='undefined')module.exports=root.SudokuEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
