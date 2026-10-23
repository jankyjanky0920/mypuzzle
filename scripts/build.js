'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let html=read('src/index.html');const base=JSON.parse(read('src/puzzles.json'));const extra=JSON.parse(read('src/variant-puzzles.json'));const pool={version:2,puzzles:[...base.puzzles,...extra.puzzles]};
if(!pool.puzzles.some(p=>p.level==='normal')||!pool.puzzles.some(p=>p.level==='extreme'))throw Error('Both verified levels are required.');
const script=s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>';
html=html.replace('<!--STYLE-->',()=>'<style>'+read('src/style.css')+'</style>').replace('<!--ENGINE-->',()=>script(read('src/engine.js'))).replace('<!--VARIANT-ENGINE-->',()=>script(read('src/variant-engine.js'))).replace('<!--TYPES-->',()=>script(read('src/puzzle-types.js'))).replace('<!--BOARD-VIEW-->',()=>script(read('src/board-view.js'))).replace('<!--STORAGE-->',()=>script(read('src/storage.js'))).replace('<!--PUZZLES-->',()=>script('window.PUZZLE_POOL='+JSON.stringify(pool)+';')).replace('<!--APP-->',()=>script(read('src/app.js')));
html=html.replace('<!--TEST-MODE-->',()=>script(read('src/test-mode.js'))).replace('<!--TEST-UI-->',()=>script(read('src/test-ui.js')));
const workerFiles=['src/engine.js','src/extra-rules.js','src/variant-engine.js','src/puzzle-types.js','src/generator.js','src/generation-worker.js'];
html=html.replace('<!--EXTRA-RULES-->',()=>script(read('src/extra-rules.js'))).replace('<!--INVENTORY-->',()=>script(read('src/inventory.js'))).replace('<!--GENERATOR-->',()=>script(read('src/generator.js'))).replace('<!--RUNTIME-GENERATION-->',()=>script(read('src/runtime-generation.js'))).replace('<!--GENERATION-SEEDS-->',()=>script('window.GENERATION_SEEDS='+read('src/generation-seeds.json')+';')).replace('<!--WORKER-SOURCE-->',()=>'<script id="generation-worker-source" type="text/plain">'+workerFiles.map(read).join('\n').replace(/<\/script/gi,'<\\/script')+'</script>');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/index.html'),html);fs.writeFileSync(path.join(root,'sudoku-practice.html'),html);
console.log(`Built self-contained HTML: ${Buffer.byteLength(html)} bytes, ${pool.puzzles.length} verified puzzles.`);

fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/index.html'),html);fs.writeFileSync(path.join(root,'docs/.nojekyll'),'');
