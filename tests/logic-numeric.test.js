'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('../src/logic-numeric'),C=require('../src/logic-csp');
test('six numeric kinds generate with a replayable unique solution',()=>{for(const k of Object.keys(N.dimensions)){let p;for(let seed=1;seed<80&&!p;seed++)try{p=N.make(k,seed);}catch(e){if(k!=='crossmath')throw e;}assert(p,k);assert(N.valid(p,p.solution),k);assert(C.verifyTrace(N.compile(p),p.proof),k);assert.equal(C.count(N.compile(p),{nodeLimit:10}).count,1,k);}});
test('crossmath evaluates in written order; mastermind uses exact and misplaced counts',()=>{assert.equal(N.evalLine([2,3,4],['+','×']),20);assert.deepEqual(N.hits([1,2,3,4,5],[1,3,2,6,7]),[1,2]);});
