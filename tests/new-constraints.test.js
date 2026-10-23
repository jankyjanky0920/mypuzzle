'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),V=require('../src/variant-engine'),T=require('../src/puzzle-types'),BV=require('../src/board-view');
const pool=require('../src/variant-puzzles.json').puzzles;
const empty=()=>Array(81).fill(0);
test('inequalities are directional, apply only to labelled edges, and render their open side toward the larger cell',()=>{
 const pairs=[{a:0,b:1},{a:3,b:2},{a:4,b:13},{a:23,b:14}],E=V.create(T.inequalityDef(pairs));
 for(const e of pairs){const v=empty();v[e.a]=7;v[e.b]=3;assert.throws(()=>E.state(v));assert.equal(E.countSolutions(v).count,0);v[e.a]=3;v[e.b]=7;assert.doesNotThrow(()=>E.state(v));
  v.fill(0);v[e.b]=3;const s=E.state(v);assert.deepEqual(E.digits(s.c[e.a]),[1,2]);v.fill(0);v[e.a]=7;assert.deepEqual(E.digits(E.state(v).c[e.b]),[8,9]);}
 const v=empty();v[40]=8;v[41]=2;assert.doesNotThrow(()=>E.state(v));
 const p={id:'inequality-glyphs-test',kind:'inequality',definition:T.inequalityDef(pairs),givens:'0'.repeat(81)},svg=BV.overlay(p);assert.equal((svg.match(/data-mark="inequality"/g)||[]).length,4);
 for(const p of pool.filter(p=>p.kind==='inequality')){assert.ok(p.definition.relations.length>0&&p.definition.relations.length<144);for(const e of p.definition.relations)assert.ok(+p.solution[e.a]<+p.solution[e.b]);}
});
test('double-framed cells restrict candidates to 1 or 8 while unmarked 1 and 8 remain legal',()=>{
 const E=V.create(T.oneOrEightDef([0]));assert.deepEqual(E.digits(E.state(empty()).c[0]),[1,8]);const v=empty();v[0]=7;assert.throws(()=>E.state(v));assert.equal(E.countSolutions(v).count,0);v[0]=1;v[40]=8;assert.doesNotThrow(()=>E.state(v));
 for(const p of pool.filter(p=>p.kind==='oneOrEight')){const d=p.definition.doubleCells,ones=[...p.solution].flatMap((v,i)=>['1','8'].includes(v)?[i]:[]);assert.ok(d.length>0&&d.length<ones.length);assert.ok(d.every(i=>ones.includes(i)));assert.ok(d.every(i=>p.givens[i]==='0'));assert.equal((BV.overlay(p).match(/data-mark="double-cell"/g)||[]).length,d.length);}
});
test('rounding cages read the first cell as tens, support 100, and enforce both directions',()=>{
 for(const [a,b,rounded]of[[2,3,20],[6,8,70],[9,6,100],[1,4,10],[1,5,20]]){const E=V.create(T.roundingDef([{a:0,b:1,rounded}])),v=empty();v[0]=a;v[1]=b;assert.doesNotThrow(()=>E.state(v));v[1]=b===9?8:9;if(Math.round((10*a+v[1])/10)*10!==rounded)assert.throws(()=>E.state(v));}
 const E=V.create(T.roundingDef([{a:0,b:9,rounded:100}])),v=empty();v[0]=9;assert.deepEqual(E.digits(E.state(v).c[9]),[5,6,7,8]);v.fill(0);v[9]=6;assert.deepEqual(E.digits(E.state(v).c[0]),[9]);
 for(const p of pool.filter(p=>p.kind==='rounding')){const cells=[];for(const e of p.definition.relations){assert.ok(e.b-e.a===9||e.b-e.a===1&&Math.floor(e.a/9)===Math.floor(e.b/9));assert.equal(Math.round((10*+p.solution[e.a]+ +p.solution[e.b])/10)*10,e.rounded);cells.push(e.a,e.b);}assert.equal(new Set(cells).size,cells.length);assert.equal((BV.overlay(p).match(/data-mark="rounding"/g)||[]).length,p.definition.relations.length);}
 assert.ok(BV.constraintMarks({definition:{relations:[{type:'round',a:0,b:1,rounded:100}]}}).includes('>100</text>'));
});
test('honeycomb uses all three straight-line directions, full blocks, and regular hexagons',()=>{
 for(const p of pool.filter(p=>p.kind==='honeycomb')){const E=T.model(p),d=p.definition,g=BV.layout(p);assert.equal(d.lines.length,35);assert.equal(E.houses.length,44);assert.equal(E.required.filter(Boolean).length,28);assert.equal(E.required.filter(x=>!x).length,16);assert.equal(d.regions.length,9);
  for(const line of d.lines){assert.ok(line.length>=1&&line.length<=9);assert.equal(new Set(line.map(i=>p.solution[i])).size,line.length);const a=g.cells[line[0]],b=g.cells[line.at(-1)];for(const i of line){const c=g.cells[i];assert.ok(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))<1e-8);}}
  for(const c of g.cells)for(let j=0;j<6;j++){const a=c.vertices[j],b=c.vertices[(j+1)%6];assert.ok(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-1)<1e-9);assert.ok(Math.abs(Math.hypot(a[0]-c.x,a[1]-c.y)-1)<1e-9);}
  assert.equal(g.cells.length,81);assert.ok(Math.abs(g.width/g.height-13*Math.sqrt(3)/14)<1e-12);assert.ok(BV.mainSvg(p).includes('honeycomb-svg'));assert.ok((BV.overlay(p).match(/<line /g)||[]).length>200);
 }
});
function tiny(extra={}){return {digits:3,side:3,active:Array.from({length:9},(_,i)=>i),units:[...[0,1,2].map(r=>({cells:[r*3,r*3+1,r*3+2]})),...[0,1,2].map(c=>({cells:[c,c+3,c+6]}))],...extra};}
function enumerate(def,accept){let count=0;const v=Array(9).fill(0);function visit(i){if(i===9){if(accept(v))count++;return;}for(let d=1;d<=3;d++){if(def.units.some(u=>u.cells.includes(i)&&u.cells.some(j=>j<i&&v[j]===d)))continue;v[i]=d;visit(i+1);v[i]=0;}}visit(0);return count;}
test('an independent tiny-board enumerator agrees on partial all-different houses, unary limits, oriented inequalities and rounding',()=>{
 const cases=[{extra:{},accept:()=>true},{extra:{units:[...tiny().units,{cells:[0,4]}]},accept:()=>true},{extra:{units:[...tiny().units,{cells:[0]}]},accept:()=>true},{extra:{restrictions:[{cell:0,values:[1,3]}]},accept:v=>[1,3].includes(v[0])},{extra:{relations:[{type:'less',a:1,b:0}]},accept:v=>v[1]<v[0]},{extra:{relations:[{type:'round',a:4,b:3,rounded:20}]},accept:v=>Math.round((v[4]*10+v[3])/10)*10===20}];
 for(const {extra,accept}of cases){const d=tiny(extra),expected=enumerate(d,accept),actual=V.create(d).countSolutions('0'.repeat(9),100,10000);assert.equal(actual.complete,true);assert.equal(actual.count,expected);assert.ok(expected>0);}
});
test('short all-different lines cannot assert hidden singles or mandatory strong links',()=>{
 const E=V.create(tiny({units:[...tiny().units,{name:'短い直線',cells:[0,4]}]})),s=E.state('0'.repeat(9));s.c[4]=6;const house=E.houses.findIndex(h=>h.length===2),proof={house,cell:0,digit:1},st={before:E.hash(s),technique:'hiddenSingle',effects:[{type:'place',cell:0,digit:1}],proof};assert.equal(E.verifyStep(s,st),false);assert.ok(!E.available(s,'extreme').some(st=>st.technique==='hiddenSingle'&&st.proof.house===house));
 const single=V.create(tiny({units:[...tiny().units,{cells:[0]}]}));assert.equal(single.countSolutions('0'.repeat(9),100).count,12);
});
