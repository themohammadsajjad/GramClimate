import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, defaults, demoData, parseCSV, toCSV } from '../lib/climate/engine.ts';

test('PCA reconstructs standardized observations with all components', () => {
  const data = demoData();
  const result = analyze(data, { ...defaults, variance: 100 });
  assert.ok(Math.abs(result.ratios.reduce((a,b)=>a+b,0)-1) < 1e-10);
  data.rows.forEach((row,i)=>row.values.forEach((v,j)=>{
    const reconstructed = result.scores[i].reduce((s,pc,k)=>s+pc*result.loadings[k][j],0);
    assert.ok(Math.abs(reconstructed-(v-result.means[j])/result.scales[j]) < 1e-8);
  }));
});

test('each algorithm produces reproducible labels and bounded scores', () => {
  for (const algorithm of ['kmeans','agglomerative','dbscan']) {
    const settings = {...defaults,algorithm};
    const a=analyze(demoData(),settings), b=analyze(demoData(),settings);
    assert.deepEqual(a.labels,b.labels);
    assert.equal(a.labels.length,72);
    assert.ok(a.silhouette >= -1 && a.silhouette <= 1);
    assert.ok(a.daviesBouldin >= 0);
  }
});

test('DBSCAN all-noise results have no invented scores', () => {
  const result=analyze(demoData(),{...defaults,algorithm:'dbscan',eps:.1,minPts:20});
  assert.equal(result.noise,72);
  assert.equal(result.silhouette,null);
  assert.equal(result.daviesBouldin,null);
});

test('CSV roundtrip handles quoted names and preserves numerical data', () => {
  const data=demoData(); data.rows[0].name='Village, "North"\nWard';
  const parsed=parseCSV(toCSV(data),'fixture.csv');
  assert.deepEqual(parsed.rows,data.rows);
  assert.deepEqual(parsed.features,data.features);
});

test('invalid observations and unsupported settings fail explicitly', () => {
  const duplicate=demoData(); duplicate.rows[1].id=duplicate.rows[0].id;
  assert.throws(()=>analyze(duplicate,defaults),/unique ID/);
  const constant=demoData(); constant.rows.forEach(r=>r.values.fill(1));
  assert.throws(()=>analyze(constant,defaults),/constant/);
  assert.throws(()=>analyze(demoData(),{...defaults,k:999}),/settings/);
  assert.throws(()=>parseCSV('id,name\n1,hello','bad.csv'),/Missing required column/);
  const bad=demoData(); bad.rows[0].latitude=100;
  assert.throws(()=>analyze(bad,defaults),/coordinates/);
});

test('export neutralizes spreadsheet formulas in text fields', () => {
  const data=demoData(); data.rows[0].name='=1+2';
  assert.ok(toCSV(data).includes('"\'=1+2"'));
});
