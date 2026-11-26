'use client';
import { useState } from 'react';
import diagnosis from '@/public/research/contrast/seasonal-diagnosis.json';
import register from '@/public/research/panchayats/phagwara-2024.json';

export default function SeasonalEvidence() {
    const [query, setQuery] = useState('');
    const matches = register.records.filter(r => r.name_as_printed.toLowerCase().includes(query.trim().toLowerCase()));
    return <>
        <section className="panel prose">
            <span className="eyebrow">FAILURE DIAGNOSIS · ARCHIVED 2025 PILOT</span>
            <h2>The season moved. The centroids stayed.</h2>
            <p>January–June profiles trained the model; July–September profiles were assigned to those frozen centroids. Every later profile landed in one cluster. The proposed projection’s common shift was <b>{diagnosis.fits[2].shiftToTrainingRadius.toFixed(2)}×</b> the training score-cloud RMS radius.</p>
            <div className="contrast-notice"><b>Diagnostic, not a validated repair.</b> Subtracting the validation cohort’s mean shift restores k=2 membership for both standard and contrast PCA. This uses validation data jointly (transductive recentering); it is not a train-only forecast correction or evidence that our method wins.</div>
            <div className="table-wrap"><table className="research-table"><caption>Temporal assignment ARI · fixed rank 2, α = 0.5</caption><thead><tr><th>Projection</th><th>k</th><th>Raw ARI</th><th>Recentered ARI</th><th>Occupied groups after recentering</th></tr></thead><tbody>{[diagnosis.fits[0],diagnosis.fits[2]].flatMap(f=>f.candidates.map(c=><tr key={`${f.method}-${c.k}`}><td>{f.method}</td><td>{c.k}</td><td>{c.originalARI.toFixed(3)}</td><td>{c.recenteredARI.toFixed(3)}</td><td>{c.recenteredOccupiedClusters}</td></tr>))}</tbody></table></div>
            <p>At k=3 the agreement remains below the 0.65 gate. At k=4 it also remains below the gate and leaves a singleton. Fixed-label silhouette is unchanged by recentering because distances between locations do not change. The 1.000 value above measures assignment agreement, <b>not 100% weather accuracy</b>.</p>
            <details><summary>Inspect seasonal feature drift</summary><p>Units are training <em>between-cell standard deviations of period means</em>, not daily weather variability.</p><div className="table-wrap"><table className="research-table"><thead><tr><th>Feature</th><th>Mean shift / spatial SD</th></tr></thead><tbody>{diagnosis.features.map(f=><tr key={f.feature}><td>{f.feature}</td><td>{f.meanShiftInTrainingSpatialSD.toFixed(2)}</td></tr>)}</tbody></table></div></details>
            <p><b>Next controlled experiment:</b> estimate a pooled seasonal correction on full prior years, freeze it, then compare both PCA methods on untouched years and blocks. The archived 2026 benchmark has already been inspected and cannot become a fresh test.</p>
            <div className="data-tools"><a className="button" href="/research/contrast/seasonal-diagnosis.json" download>Download diagnosis</a><a className="button" href="/research/contrast/SEASONAL_DIAGNOSIS.md" download>Methods & next experiment</a></div>
        </section>
        <section className="panel prose">
            <span className="eyebrow">SOURCE-VERIFIED NAMES · GEOSPATIAL VERIFICATION PENDING</span>
            <h2>91 records. One traceable source.</h2>
            <p>Phagwara block, Kapurthala, Punjab. Names and block membership were transcribed from all three pages of the district administration’s September 2024 nomination document. Printed spellings are retained.</p>
            <div className="contrast-notice"><b>Historical register only.</b> Current LGD codes, panchayat boundaries and local weather observations remain unverified. These records are not connected to the 16 weather cells or used to train the model. Electoral table groups are not climate clusters.</div>
            <div className="data-tools"><a className="button" href="/research/panchayats/phagwara-2024.csv" download>Download CSV · 91 entries</a><a className="button" href="/research/panchayats/phagwara-2024.json" download>JSON & provenance</a><a className="button" href={register.source.documentURL} target="_blank" rel="noreferrer">Official source PDF</a></div>
            <label htmlFor="panchayat-search">Search the historical register</label><input id="panchayat-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try Hardaspur or Palahi" style={{display:'block',width:'100%',padding:'12px',marginTop:8,background:'#ffffff',color:'inherit',border:'1px solid #4b6560',borderRadius:8}}/>
            <p role="status">{matches.length} of {register.count} records · Source period: September 2024 · Checked: 29 October 2026</p>
            <div className="table-wrap" style={{maxHeight:360,overflow:'auto'}}><table className="research-table"><thead><tr><th>Name as printed</th><th>Block</th><th>PDF page / row / item</th><th>Model readiness</th></tr></thead><tbody>{matches.map(r=><tr key={r.record_id}><td>{r.name_as_printed}</td><td>{r.block_as_printed}</td><td>{r.source_page} / {r.source_table_row} / {r.source_item}</td><td>Awaiting LGD + geometry + local data</td></tr>)}</tbody></table></div>
            {!matches.length && <p>No matching name in this historical source.</p>}
            <p>Record identifiers are internal references, not LGD codes. The JSON includes the source URL and SHA-256 fingerprint. Current administrative completeness and commercial reuse terms still need checking.</p>
        </section>
    </>;
}
