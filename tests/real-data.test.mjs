import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, defaults, demoData, parseCSV, toCSV } from '../lib/climate/engine.ts';
import { evaluateFixedMembership, verifyBenchmark } from '../lib/climate/evaluation.ts';
const read = name => JSON.parse(fs.readFileSync(new URL(`../public/research/${name}.json`, import.meta.url)));
const train=read('train'), heldout=read('test'), report=read('benchmark');

test('production engine reproduces independently calculated real test scores', () => {
    const result=verifyBenchmark(train,heldout,report.baselineConfig,report.selected.config);
    assert.ok(Math.abs(result.baseline.silhouette-report.test.baseline)<1e-8);
    assert.ok(Math.abs(result.candidate.silhouette-report.test.candidate)<1e-8);
    assert.deepEqual(analyze(train,report.activeConfig).clusters.map(c=>c.count).sort((a,b)=>a-b),[3,13]);
});

test('evaluation uses training transforms, matches by ID and cannot mutate the fitted model', () => {
    const fit=analyze(train,report.activeConfig), snapshot=JSON.stringify(fit);
    const expected=evaluateFixedMembership(train,heldout,fit);
    const reordered=structuredClone(heldout);reordered.rows.reverse();
    assert.deepEqual(evaluateFixedMembership(train,reordered,fit),expected);
    const modified=structuredClone(heldout);modified.rows[0].values[0]+=40;
    assert.notEqual(evaluateFixedMembership(train,modified,fit).silhouette,expected.silhouette);
    assert.equal(JSON.stringify(fit),snapshot);
    const wrong=structuredClone(heldout);wrong.features.reverse();
    assert.throws(()=>evaluateFixedMembership(train,wrong,fit),/features/);
    const wrongSite=structuredClone(heldout);wrongSite.rows[0].latitude+=.1;
    assert.throws(()=>evaluateFixedMembership(train,wrongSite,fit),/locations/);
});

test('no-PCA scores use original standardized features and multi-start cannot worsen fit inertia', () => {
    const single=analyze(train,{...defaults,reduction:'none',starts:1});
    const multi=analyze(train,{...defaults,reduction:'none',starts:16});
    assert.ok(Math.abs(single.commonSilhouette-single.silhouette)<1e-10);
    const inertia = fit => train.rows.reduce((sum,row,i)=>{
        const center=fit.clusters.find(c=>c.id===fit.labels[i]).center;
        return sum+row.values.reduce((s,v,j)=>s+((v-fit.means[j])/fit.scales[j]-center[j])**2,0);
    },0);
    assert.ok(inertia(multi)<=inertia(single)+1e-8);
});

test('repeated profiles, tiny variance and target labels are handled explicitly', () => {
    const data=demoData();data.rows[1].values=[...data.rows[0].values];
    assert.equal(analyze(data,defaults).duplicateProfiles,1);
    for(const row of data.rows) row.values[0]=1+Number.EPSILON;
    assert.ok(analyze(data,defaults).constant.includes(data.features[0]));
    const leaked=structuredClone(data);leaked.features[0]='cluster_id';
    assert.throws(()=>analyze(leaked,defaults),/label/);
    assert.throws(()=>parseCSV(toCSV(data).replace('temperature_c','TARGET'),'bad.csv'),/label/);
    const two=demoData();two.rows.forEach((row,i)=>row.values.fill(i%2));
    assert.throws(()=>analyze(two,defaults),/distinct/);
});

// This fixture is consumed by the NumPy/scikit-learn numerical check.
fs.writeFileSync('/tmp/gram-real-reference.json',JSON.stringify({data:train,runs:[
    analyze(train,report.activeConfig),
    analyze(train,{...defaults,reduction:'none',starts:16}),
    analyze(train,{...defaults,algorithm:'agglomerative'}),
    analyze(train,{...defaults,algorithm:'dbscan',eps:2,minPts:2})
]}));
