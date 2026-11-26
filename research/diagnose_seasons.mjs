// Run from the repository root with node --experimental-strip-types.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { analyzeContrast, adjustedRand } from '../lib/climate/contrast.ts';
const path = 'public/research/contrast/grid-input.json';
const raw = fs.readFileSync(path);
const input = JSON.parse(raw);
const result = analyzeContrast(input, {alpha: .5, components: 2, maxK: 4});
const rows = [...input.training.rows].sort((a,b)=>a.id.localeCompare(b.id));
const lookup = new Map(input.validation.rows.map(r=>[r.id,r]));
const mean = x => x.reduce((a,b)=>a+b,0)/x.length;
const norm = x => Math.sqrt(x.reduce((s,v)=>s+v*v,0));
const scales = rows[0].values.map((_,j)=>Math.sqrt(rows.reduce((s,r)=>s+(r.values[j]-mean(rows.map(r=>r.values[j])))**2,0)/(rows.length-1)));
const shift = scales.map((s,j)=>(mean(rows.map(r=>lookup.get(r.id).values[j]))-mean(rows.map(r=>r.values[j])))/s);
const centered = structuredClone(input);
centered.validation.rows.forEach(r=>{r.values=r.values.map((v,j)=>v-shift[j]*scales[j]);});
const recentered = analyzeContrast(centered, {alpha:.5,components:2,maxK:4});
const fits = result.fits.map((fit,index)=>{
 const projectedShift=fit.basis.map(v=>v.reduce((s,x,j)=>s+x*shift[j]*Math.sqrt(fit.reliability[j]),0));
 const rmsRadius=Math.sqrt(mean(fit.scores.map(s=>norm(s)**2)));
 return {method:fit.name,shiftToTrainingRadius:norm(projectedShift)/rmsRadius,candidates:fit.candidates.map((c,i)=>{
  const other=recentered.fits[index].candidates[i];
  if(JSON.stringify(c.labels)!==JSON.stringify(other.labels)) throw Error('Diagnostic changed training fit');
  if(Math.abs(c.validationFixedLabels.silhouette-other.validationFixedLabels.silhouette)>1e-8) throw Error('Translation changed pairwise geometry');
  return {k:c.k,originalARI:c.stabilityARI,originalOccupiedClusters:new Set(c.validationLabels).size,recenteredARI:adjustedRand(c.labels,other.validationLabels),recenteredOccupiedClusters:new Set(other.validationLabels).size,fixedLabelSilhouette:c.validationFixedLabels.silhouette,originalSizes:c.validationSizes,recenteredSizes:other.validationSizes};
 })};
});
const report={generated:'2026-10-29',scope:'16 GFS grid cells; analyst-defined latitude groups; not panchayats',inputSHA256:crypto.createHash('sha256').update(raw).digest('hex'),periods:input.periods,settings:{alpha:.5,components:2,maxK:4},features:input.training.features.map((feature,j)=>({feature,meanShiftInTrainingSpatialSD:shift[j]})),fits,interpretation:'A common seasonal translation can collapse nearest-centroid assignments while leaving fixed-label silhouette unchanged. Recentring uses the entire validation cohort: this is a transductive diagnostic, not an independently validated correction. Training standard deviations measure between-cell variation of period means, not daily weather variability.',nextExperiment:'Fit a pooled seasonal adjustment using full prior years only; freeze it before evaluation on untouched years and blocks. Compare raw, seasonal-adjusted standard PCA, and seasonal-adjusted contrast PCA at identical ranks and k. No model superiority or patent novelty is established.'};
fs.writeFileSync('public/research/contrast/seasonal-diagnosis.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
