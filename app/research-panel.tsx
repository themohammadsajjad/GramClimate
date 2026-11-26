'use client';
import { useState } from 'react';
import { Check, Download, FlaskConical, LoaderCircle, Play } from 'lucide-react';
import type { Dataset, Settings } from '@/lib/climate/engine';
import training from '@/public/research/train.json';
import validation from '@/public/research/validation.json';
import heldout from '@/public/research/test.json';
import report from '@/public/research/benchmark.json';
import selection from '@/public/research/selection.json';

export default function ResearchPanel({ load, busy }: { load: (data: Dataset, settings: Settings) => Promise<unknown>; busy: boolean }) {
    const [checking, setChecking] = useState(false), [verification, setVerification] = useState('');
    async function verify() {
        setChecking(true); setVerification('');
        try {
            const response = await fetch('/api/benchmark');
            const value = await response.json();
            if (!response.ok || !value || typeof value !== 'object' || !('matchesSavedReport' in value) || value.matchesSavedReport !== true) throw new Error('Verification did not match. Keep the saved results and investigate before making a claim.');
            setVerification('Verified: the deployed engine reproduces both saved 2026 test scores to 1e−8 tolerance.');
        } catch (error) { setVerification(error instanceof Error ? error.message : 'Verification failed. Try again.'); }
        finally { setChecking(false); }
    }
    return <div className="research-stack">
        <section className="panel prose"><span className="eyebrow">REAL DATA · FROZEN TEMPORAL TEST</span><h2>Evidence before a stronger claim.</h2>
            <p>NOAA GFS forecasts from 16 research grid cells. Model selection used 2025 data; the configuration was saved before the 2026 archive was requested. These are location groups, not verified panchayat microclimates.</p>
            <div className="research-metrics"><div><small>Baseline test silhouette</small><strong>{report.test.baseline.toFixed(3)}</strong><span>PCA 90% · k=4 · single start</span></div><div><small>Selected candidate</small><strong>{report.test.candidate.toFixed(3)}</strong><span>{report.selected.config.reduction === 'none' ? 'No PCA' : `PCA ${report.selected.config.variance}%`} · k={report.selected.config.k} · 16 starts</span></div><div><small>Test difference</small><strong>{report.test.delta >= 0 ? '+' : ''}{report.test.delta.toFixed(3)}</strong><span>95% conditional CI [{report.test.pairedDeltaCI95.map(v => v.toFixed(3)).join(', ')}]</span></div></div>
            <p className="research-decision"><Check size={18}/>{report.promoted ? 'Pilot promotion gate passed. The selected configuration is the default for the archived training dataset.' : 'Promotion gate did not pass. The original baseline remains the default.'}</p>
            <p>The candidate uses {report.selected.config.k} groups versus four in the baseline. Higher separation at a coarser grouping does not prove better fine-scale downscaling. The test evaluates fixed regional memberships across time, not daily weather prediction.</p>
            <div className="data-tools"><button className="button primary" disabled={checking} onClick={() => void verify()}>{checking ? <LoaderCircle className="spin" size={16}/> : <FlaskConical size={16}/>}Verify saved benchmark</button><a className="button" href="/research/benchmark.json" download><Download size={16}/>Results JSON</a><a className="button" href="/research/PROTOCOL_V2.md" download>Evaluation protocol</a></div>
            {verification && <p role="status">{verification}</p>}
        </section>
        <div className="bottom-grid"><section className="panel prose"><h2>Same scale. Separate periods.</h2><p>Every score uses the original 12 features, transformed using training means and sample standard deviations. Test data never refits the scaler or PCA.</p><ul><li>Training: Jan–Jun 2025 · 181 days.</li><li>Validation: 4 Jul–30 Sep 2025 · 89 days.</li><li>Fresh test: 4 Jan–30 Sep 2026 · {report.test.days} complete days.</li><li>Stability: 100 synchronized seven-day training block resamples.</li><li>Uncertainty: 500 paired seven-day test block resamples.</li></ul><p>18–19 April were excluded across every cell and feature after source cloud-cover gaps were detected, before test scoring. No values were filled. <a href="/research/DATA_QUALITY_AMENDMENT.md" download>Read the missing-data amendment.</a></p><p>Candidate training stability: mean ARI <b>{report.selected.stability.toFixed(3)}</b>. Training cluster sizes: <b>{report.selected.sizes.join(' / ')}</b>.</p></section>
        <section className="panel prose"><h2>Quarterly stress checks</h2><div className="table-wrap"><table className="research-table"><thead><tr><th>Period</th><th>Baseline</th><th>Candidate</th></tr></thead><tbody>{report.test.quarterly.map(q => <tr key={q.period}><td>{q.period}</td><td>{q.baseline.toFixed(3)}</td><td>{q.candidate.toFixed(3)}</td></tr>)}</tbody></table></div><p>All periods use the same 16 cells. Unseen regions, local station accuracy and administrative boundary matching remain unvalidated. The confidence interval is conditional on this grid and these fitted models.</p></section></div>
        <section className="panel prose"><h2>Inspect the real profiles</h2><p>Load a period to explore its values, clusters and component loadings. Loading a dataset runs a new in-sample analysis; it does not replace the frozen test above.</p><div className="data-tools">{[{name:'2025 training',data:training},{name:'2025 validation',data:validation},{name:'2026 test profiles',data:heldout}].map(item => <button key={item.name} className="button" disabled={busy} onClick={() => void load(item.data as Dataset,report.activeConfig as Settings).catch(() => {})}><Play size={14}/>{item.name}</button>)}</div><p>Data: NOAA GFS via Open-Meteo, CC BY 4.0. Cloud-cover corrections are documented; raw archives and request manifests are included for reproducibility. The hosted API’s commercial-use terms are separate.</p><div className="data-tools"><a className="source-link" href="/research/real-data-archives.zip" download>Download raw weather archives</a><a className="source-link" href="https://open-meteo.com/en/docs/previous-runs-api" target="_blank" rel="noreferrer">Source documentation ↗</a></div></section>
        <section className="panel prose"><h2>Candidate selection record</h2><p>Selected using validation silhouette among candidates with no singleton clusters and mean stability ARI ≥0.65. The 2026 test did not choose k or PCA variance.</p><div className="table-wrap"><table className="research-table"><thead><tr><th>Model</th><th>k</th><th>Train</th><th>Validation</th><th>Stability ARI</th><th>Eligible</th></tr></thead><tbody>{selection.candidates.map(c => <tr key={c.id} className={c.id === selection.selected ? 'research-selected' : ''}><td>{c.config.reduction === 'none' ? 'No PCA' : `PCA ${c.config.variance}%`} · {c.config.starts} start(s)</td><td>{c.config.k}</td><td>{c.train.toFixed(3)}</td><td>{c.validation.toFixed(3)}</td><td>{c.stability.toFixed(3)}</td><td>{c.id === 'candidate-0' ? 'Baseline' : c.eligible ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div><a className="source-link" href="/research/selection.json" download>Download frozen selection record</a></section>
    </div>;
}
