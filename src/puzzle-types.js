(function(root){
'use strict';
const B=root.SudokuEngine||(typeof require==='function'?require('./engine.js'):null),V=root.VariantEngine||(typeof require==='function'?require('./variant-engine.js'):null);
const TYPES={
 standard:{name:'スタンダードナンプレ',rule:'どのタテ列、ヨコ列、3×3のブロックにも1から9までの数字が1つずつ入る。'},
 next:{name:'次の一手ナンプレ',rule:'タテヨコ各列と3×3のブロックに1から9が1回ずつ現れるルールから、次に数字が確定する1マスと、その数字を答える。完成まで解く必要はありません。'},
 shuriken:{name:'4合体ミニ幾何学ナンプレ',rule:'四つの6×6の盤面それぞれで、タテヨコ各列と太線で囲まれた6マスのブロックに1から6を1つずつ入れる。角の2×3の共通ブロックは、重なる二つの盤面で同じ数字を使う。'},
 costume:{name:'着せ替えナンプレ',rule:'タテヨコ各列、および提示された3種類すべての区切り方の各6マスのブロックに、1から6が1つずつ入るようにする。'},
 consecutive:{name:'一つ違いナンプレ',rule:'各タテ列・ヨコ列・3×3ブロックに1から9を1つずつ入れる。二重線を挟んで接する数字の差は1、それ以外のタテヨコに接する数字の差は2以上。'}
};
const range=n=>Array.from({length:n},(_,i)=>i),coord=i=>String.fromCharCode(65+i%9)+String.fromCharCode(74+Math.floor(i/9));
function rowsAndCols(side,boardSide=side,cells=null,prefix=''){const at=(r,c)=>cells?cells[r*boardSide+c]:r*side+c;return [...range(boardSide).map(r=>({name:`${prefix}${r+1}行目`,cells:range(boardSide).map(c=>at(r,c))})),...range(boardSide).map(c=>({name:`${prefix}${c+1}列目`,cells:range(boardSide).map(r=>at(r,c))}))];}
function standardDef(edges=[]){return {digits:9,side:9,active:range(81),units:[...rowsAndCols(9),...range(9).map(b=>({name:`第${b+1}ブロック`,cells:range(9).map(j=>(Math.floor(b/3)*3+Math.floor(j/3))*9+b%3*3+j%3)}))],edges,regions:range(9).map(b=>range(9).map(j=>(Math.floor(b/3)*3+Math.floor(j/3))*9+b%3*3+j%3))};}
function costumeDef(partitions){return {digits:6,side:6,active:range(36),partitions,units:[...rowsAndCols(6),...partitions.flatMap((parts,k)=>parts.map((cells,j)=>({name:`区切り${k+1}の第${j+1}ブロック`,cells})))],regions:null};}
function rotate(i){const r=Math.floor(i/13),c=i%13;return c*13+12-r;}
function shurikenDef(localRegions){const top=range(36).map(i=>Math.floor(i/6)*13+4+i%6),boards=[top];for(let k=1;k<4;k++)boards.push(boards[k-1].map(rotate));const labels=['上','右','下','左'],units=[],regs=[];for(let b=0;b<4;b++){const cells=boards[b]; // Rows / columns are specified in the local orientation of each rotated board.
 units.push(...rowsAndCols(13,6,cells,labels[b]+'盤の'));for(let k=0;k<6;k++){const group=localRegions[k].map(i=>cells[i]);units.push({name:`${labels[b]}盤の第${k+1}ブロック`,cells:group});if(!regs.some(r=>r.slice().sort((a,b)=>a-b).join(',')===group.slice().sort((a,b)=>a-b).join(',')))regs.push(group);}}
 const active=[...new Set(boards.flat())].sort((a,b)=>a-b),members=range(169).map(i=>boards.flatMap((b,k)=>b.includes(i)?[k]:[]));return {digits:6,side:13,active,boards,regions:regs,units,shared:active.filter(i=>members[i].length===2),boardMembership:members,localRegions};}
const cache=new Map();
function model(p){if(cache.has(p.id))return cache.get(p.id);let e;if(!p.kind||p.kind==='standard'||p.kind==='next'){e={...B,n:9,side:9,total:81,active:range(81),activeSet:new Set(range(81)),def:standardDef(),isComplete:v=>v.every(Boolean),supported:Object.keys(B.TECH)};if(p.kind==='next')e.rc=coord;}else e=V.create(p.definition);cache.set(p.id,e);return e;}
function parseNextAnswer(input){const s=String(input).normalize('NFKC').replace(/\s+/g,'').toUpperCase(),m=/^([A-I])([J-R])([1-9])$/.exec(s);if(!m)return null;return {cell:(m[2].charCodeAt(0)-74)*9+m[1].charCodeAt(0)-65,digit:+m[3],text:s};}
root.PuzzleTypes={TYPES,model,standardDef,costumeDef,shurikenDef,range,coord,parseNextAnswer,rowsAndCols};if(typeof module!=='undefined')module.exports=root.PuzzleTypes;
})(typeof globalThis!=='undefined'?globalThis:this);
