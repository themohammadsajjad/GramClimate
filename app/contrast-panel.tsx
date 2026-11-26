'use client';
import { useRef, useState } from 'react';
import { Download, FlaskConical, LoaderCircle, Upload } from 'lucide-react';
import SeasonalEvidence from './seasonal-evidence';
import gridInput from '@/public/research/contrast/grid-input.json';
import type { ContrastInput, ContrastResult, ContrastSettings } from '@/lib/climate/contrast';

const percentage = (v: number | null) => v === null ? 'Undefined' : `${(v * 100).toFixed(1)}%`;
const number = (v: number | null) => v === null ? 'Undefined' : v.toFixed(3);
function save(name: string, value: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ContrastPanel() {
    const [input, setInput] = useState<ContrastInput>(gridInput as ContrastInput);
    const [settings, setSettings] = useState<ContrastSettings>({ alpha: .5, components: 2, maxK: 4 });
    const [result, setResult] = useState<ContrastResult | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const file = useRef<HTMLInputElement>(null);
    const [inputName, setInputName] = useState('Archived GFS · 16 cells · analyst-defined groups');
    const [pendingInput, setPendingInput] = useState<unknown>(null);
    async function run() {
        setBusy(true); setError(''); setResult(null);
        try {
            const payload = pendingInput ?? input;
            const response = await fetch('/api/contrast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: payload, settings }) });
            const value = await response.json() as ContrastResult & { error?: string };
            if (!response.ok) throw new Error(value.error || 'Research analysis failed.');
            setInput(payload as ContrastInput); setPendingInput(null); setResult(value);
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to run analysis.'); }
        finally { setBusy(false); }
    }
    async function upload(selected?: File) {
        if (!selected) return;
        setError(''); setResult(null);
        try {
            if (selected.size > 450000) throw new Error('Use a JSON file smaller than 450 KB.');
            const parsed: unknown = JSON.parse(await selected.text());
            if (!parsed || typeof parsed !== 'object') throw new Error('Expected a research input object.');
            setPendingInput('input' in parsed ? parsed.input : parsed); setInputName(`${selected.name} · pending server validation`);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not read JSON.'); }
        if (file.current) file.current.value = '';
    }
    const proposed = result?.fits.find(f => f.id === 'contrast');
    const chosen = proposed?.candidates.find(c => c.k === proposed.selectedK);
    return <div className="research-stack contrast-lab">
        <section className="panel prose contrast-intro">
            <span className="eyebrow">METHOD DEVELOPMENT · EXPERIMENTAL 0.1</span>
            <h2>Preserve the differences<br/>inside the average.</h2>
            <p>A working research prototype for within-block contrast-preserving PCA. It compares three projections at the same rank and cluster counts, then leaves unsupported resolutions unresolved.</p>
            <div className="contrast-notice"><b>Research hypothesis, not a patent claim.</b> Contrastive and multilevel PCA already exist. This prototype does not establish novelty, inventive step or panchayat weather accuracy.</div>
            <div className="contrast-steps"><span>01 · Separate group contrasts</span><span>02 · Fit a weighted projection</span><span>03 · Check temporal persistence</span></div>
        </section>
        <section className="panel prose">
            <h2>Input & experiment controls</h2>
            <p><b>{inputName}</b></p>
            <p>The bundled experiment uses real 2025 GFS values and four analyst-defined latitude strips. These strips are not official blocks. No panchayat covariates or observations are bundled. All reliability weights are 1; the weighted baseline therefore matches standard PCA.</p>
            <div className="data-tools">
                <button className="button" disabled={busy} onClick={() => file.current?.click()}><Upload size={16}/>Upload research JSON</button>
                <button className="button" disabled={busy} onClick={() => { setInput(gridInput as ContrastInput); setPendingInput(null); setInputName('Archived GFS · 16 cells · analyst-defined groups'); setResult(null); setError(''); }}>Reset archived input</button>
                <a className="button" href="/research/contrast/grid-input.json" download>Download input example</a>
                <a className="button" href="/research/contrast/METHOD.md" download>Method & input contract</a>
            </div>
            <input className="sr-only" aria-label="Upload contrast research JSON" ref={file} type="file" accept=".json,application/json" onChange={e => void upload(e.target.files?.[0])}/>
            <div className="contrast-controls">
                <label>Local contrast emphasis · {settings.alpha.toFixed(2)}<input aria-label="Local contrast emphasis" type="range" min="0" max="1" step="0.05" value={settings.alpha} disabled={busy} onChange={e => { setSettings(s => ({ ...s, alpha: +e.target.value })); setResult(null); }}/><small>0 = total covariance · 1 = within-group covariance</small></label>
                <label>Projection rank<select aria-label="Projection rank" value={settings.components} disabled={busy} onChange={e => { setSettings(s => ({ ...s, components: +e.target.value })); setResult(null); }}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} component{n > 1 ? 's' : ''}</option>)}</select></label>
                <label>Maximum candidate k<select aria-label="Maximum candidate k" value={settings.maxK} disabled={busy} onChange={e => { setSettings(s => ({ ...s, maxK: +e.target.value })); setResult(null); }}>{[2,3,4,5,6].map(n => <option key={n} value={n}>{n} groups</option>)}</select></label>
            </div>
            <button className="button primary" disabled={busy} onClick={() => void run()}>{busy ? <LoaderCircle size={16} className="spin"/> : <FlaskConical size={16}/>} {busy ? 'Computing comparisons…' : 'Run contrast experiment'}</button>
            {error && <p role="alert" className="contrast-error">{error}</p>}
            <p>Weights and source evidence are supplied in the JSON. No labels are used to train clusters. Uploaded inputs are processed by the server and are not saved to an application database.</p>
        </section>
        <SeasonalEvidence/>
        {result && <>
            <section className="panel prose" aria-live="polite"><span className="eyebrow">COMPLETED · {result.scope.toUpperCase()}</span><h2>{chosen ? `${chosen.k} groups pass exploratory gates` : 'Resolution remains unresolved'}</h2><p>{chosen ? 'This resolution passed the declared size, retention and temporal-persistence thresholds. It is not a validated microclimate classification.' : 'None of the proposed model’s candidate resolutions passed every gate. Inspect the reasons below; no supported clustering is asserted.'}</p>
                <p>Training: {result.periods.training.join(' → ')}. Validation: {result.periods.validation.join(' → ')}. Scaler, projection and centroids are fitted only on training profiles.</p>
                <div className="data-tools"><button className="button" onClick={() => save('GramClimate_Contrast_Experiment.json', { input, result })}><Download size={16}/>Export reproducible experiment</button><a href="/research/contrast/INVENTION_REVIEW.md" className="button" download>Invention review brief</a></div>
            </section>
            <div className="contrast-comparisons">{result.fits.map(fit => <section className="panel prose" key={fit.id}><span className="eyebrow">{fit.id === 'contrast' ? 'PROPOSED' : 'BASELINE'}</span><h3>{fit.name}</h3><div className="contrast-value">{percentage(fit.withinRetention)}</div><p>Within-group contrast retained in a common standardized space</p><div className="contrast-meter"><span style={{ width: `${Math.max(0, Math.min(100, (fit.withinRetention ?? 0) * 100))}%` }}/></div><p>Total variance: <b>{percentage(fit.totalRetention)}</b><br/>Effective α: <b>{fit.effectiveAlpha.toFixed(2)}</b><br/>Gate-selected k: <b>{fit.selectedK ?? 'Unresolved'}</b></p></section>)}</div>
            <section className="panel prose"><h2>Compare equal resolutions</h2><p>Silhouette is computed in the same original standardized feature space. Validation silhouette keeps training labels fixed. ARI compares those labels with nearest-training-centroid assignments in the later period.</p><div className="table-wrap"><table className="research-table"><thead><tr><th>Projection</th><th>k</th><th>Train silhouette</th><th>Validation silhouette</th><th>Temporal ARI</th><th>Gate decision</th></tr></thead><tbody>{result.fits.flatMap(fit => fit.candidates.map(c => <tr key={`${fit.id}-${c.k}`}><td>{fit.name}</td><td>{c.k}</td><td>{number(c.training.silhouette)}</td><td>{number(c.validationFixedLabels.silhouette)}</td><td>{number(c.stabilityARI)}</td><td>{c.eligible ? 'Pass' : c.reasons.join('; ')}</td></tr>))}</tbody></table></div></section>
            {chosen && <section className="panel prose"><h2>Membership persistence</h2><p>Peer overlap is the Jaccard overlap of same-cluster neighbours across the two periods. It is a descriptive agreement score, not a probability of correctness.</p><div className="table-wrap"><table className="research-table"><thead><tr><th>Location</th><th>Declared group</th><th>Training cluster</th><th>Later assignment</th><th>Peer overlap</th></tr></thead><tbody>{result.locations.map((r, i) => <tr key={r.id}><td>{r.name}</td><td>{r.group}</td><td>{chosen.labels[i] + 1}</td><td>{chosen.validationLabels[i] + 1}</td><td>{percentage(chosen.pointAgreement[i])}</td></tr>)}</tbody></table></div></section>}
            <section className="panel prose"><h2>Interpretation limits</h2><ul>{result.warnings.map(w => <li key={w}>{w}</li>)}</ul><p>Changing α or rank after viewing validation results is exploratory tuning. A new untouched spatial/temporal test is needed before claiming improvement. The existing frozen 2026 benchmark is not used by this prototype.</p></section>
        </>}
    </div>;
}
