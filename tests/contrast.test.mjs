import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeContrast, adjustedRand } from '../lib/climate/contrast.ts';
const input = JSON.parse(fs.readFileSync('public/research/contrast/grid-input.json','utf8'));
const settings = {alpha:.5,components:2,maxK:4};
const run = analyzeContrast(input,settings);
fs.writeFileSync('/tmp/contrast-reference.json',JSON.stringify({input,settings,result:run}));
test('equal weights and alpha zero recover the ordinary PCA baseline',()=>{
 const r=analyzeContrast(input,{...settings,alpha:0});
 for(const f of r.fits.slice(1)) {
  assert.deepEqual(f.basis,r.fits[0].basis);
  assert.deepEqual(f.candidates,r.fits[0].candidates);
 }
});
test('validation cannot change training scaler, projection or clusters',()=>{
 const changed=structuredClone(input);changed.validation.rows.forEach(r=>r.values[0]+=50);
 const result=analyzeContrast(changed,settings);
 assert.deepEqual(result.scaler,run.scaler);
 for(let i=0;i<3;i++) {
  assert.deepEqual(result.fits[i].basis,run.fits[i].basis);
  assert.deepEqual(result.fits[i].candidates.map(c=>c.labels),run.fits[i].candidates.map(c=>c.labels));
 }
 assert.notDeepEqual(result.fits[2].candidates.map(c=>c.validationFixedLabels),run.fits[2].candidates.map(c=>c.validationFixedLabels));
});
test('row order does not alter results or ID alignment',()=>{
 const reordered=structuredClone(input);reordered.training.rows.reverse();reordered.validation.rows.reverse();
 assert.deepEqual(analyzeContrast(reordered,settings),run);
});
test('no within-group signal gives unresolved rather than fabricated local separation',()=>{
 const x=structuredClone(input);
 for(const data of [x.training,x.validation]) {
  const representative=new Map();
  data.rows.forEach(r=>{if(!representative.has(r.block)) representative.set(r.block,r.values);r.values=[...representative.get(r.block)];});
 }
 const fit=analyzeContrast(x,settings).fits[2];
 assert.equal(fit.effectiveAlpha,0);assert.equal(fit.selectedK,null);
 assert.ok(fit.candidates.every(c=>c.reasons.includes('No within-group input contrast')));
});
test('invalid weights, overlap, false panchayat scope and changed membership are rejected',()=>{
 for(const mutate of [x=>x.reliability.fill(0),x=>x.reliability[0]=-1,x=>x.periods.validation[0]='2025-01-01',x=>x.scope='panchayat',x=>x.validation.rows[0].block='other']) {
  const x=structuredClone(input);mutate(x);assert.throws(()=>analyzeContrast(x,settings));
 }
 assert.throws(()=>analyzeContrast(input,{...settings,alpha:NaN}));
});
test('ARI is invariant to label names and retention remains bounded',()=>{
 assert.equal(adjustedRand([0,0,1,1],[8,8,3,3]),1);
 assert.ok(Math.abs(adjustedRand([0,0,1,1],[0,1,0,1])+.5)<1e-12);
 const weighted=structuredClone(input);weighted.reliability[0]=0;weighted.reliability[1]=.2;
 const r=analyzeContrast(weighted,settings);
 for(const f of r.fits) for(const value of [f.totalRetention,f.withinRetention,f.weightedWithinRetention]) assert.ok(value===null || value>=-1e-9 && value<=1+1e-9);
 fs.writeFileSync('/tmp/contrast-weighted-reference.json',JSON.stringify({input:weighted,settings,result:r}));
});
