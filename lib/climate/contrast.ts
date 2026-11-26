import { validate, eigen, kmeans, clusterMetrics, type Dataset } from './engine.ts';

export type ContrastInput = {
    schemaVersion: 1;
    scope: 'research-grid' | 'panchayat';
    provenance: { source: string; grouping: string; reliabilityBasis: string; boundarySource?: string };
    periods: { training: [string, string]; validation: [string, string] };
    training: Dataset;
    validation: Dataset;
    featureRoles: ('weather' | 'local')[];
    reliability: number[];
};
export type ContrastSettings = { alpha: number; components: number; maxK: number };
const average = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const dot = (x: number[], y: number[]) => x.reduce((s, v, j) => s + v * y[j], 0);
const distance = (x: number[], y: number[]) => x.reduce((s, v, j) => s + (v - y[j]) ** 2, 0);
const trace = (a: number[][]) => a.reduce((s, r, i) => s + r[i], 0);
const covariance = (x: number[][], divisor: number) => x[0].map((_, j) => x[0].map((__, k) => x.reduce((s, row) => s + row[j] * row[k], 0) / divisor));
function centeredWithin(x: number[][], groups: string[]) {
    const means = new Map([...new Set(groups)].map(g => [g, x[0].map((_, j) => average(x.filter((_, i) => groups[i] === g).map(row => row[j])))]));
    return x.map((row, i) => row.map((v, j) => v - means.get(groups[i])![j]));
}

export function adjustedRand(a: number[], b: number[]) {
    const choose = (n: number) => n * (n - 1) / 2;
    const count = (values: string[]) => { const m = new Map<string, number>(); values.forEach(v => m.set(v, (m.get(v) || 0) + 1)); return [...m.values()].reduce((s, n) => s + choose(n), 0); };
    const pairs = choose(a.length), both = count(a.map((v, i) => `${v}:${b[i]}`));
    const ca = count(a.map(String)), cb = count(b.map(String)), expected = ca * cb / pairs;
    const denominator = (ca + cb) / 2 - expected;
    return Math.abs(denominator) < 1e-12 ? 1 : (both - expected) / denominator;
}

export function validateContrast(input: ContrastInput, settings: ContrastSettings) {
    if (!input || input.schemaVersion !== 1 || !['research-grid', 'panchayat'].includes(input.scope)) throw new Error('Use contrast input schemaVersion 1 and an explicit scope.');
    validate(input.training); validate(input.validation);
    const train = input.training, check = input.validation, p = train.features.length;
    if (train.rows.length > 120) throw new Error('The research endpoint supports at most 120 profiles.');
    if (!settings || !Number.isFinite(settings.alpha) || settings.alpha < 0 || settings.alpha > 1 || !Number.isInteger(settings.components) || settings.components < 1 || settings.components > p || !Number.isInteger(settings.maxK) || settings.maxK < 2 || settings.maxK > 6) throw new Error('Use alpha 0–1, valid component count and maxK 2–6.');
    if (!Array.isArray(input.reliability) || input.reliability.length !== p || input.reliability.some(v => !Number.isFinite(v) || v < 0 || v > 1) || !input.reliability.some(v => v > 0)) throw new Error('Supply one reliability weight in [0,1] per feature; at least one must be positive.');
    if (!Array.isArray(input.featureRoles) || input.featureRoles.length !== p || input.featureRoles.some(v => !['weather', 'local'].includes(v)) || !input.featureRoles.includes('weather')) throw new Error('Declare weather/local feature roles, including at least one weather feature.');
    for (const key of ['source', 'grouping', 'reliabilityBasis'] as const) if (typeof input.provenance?.[key] !== 'string' || !input.provenance[key].trim() || input.provenance[key].length > 2000) throw new Error(`Document provenance.${key}.`);
    if (input.scope === 'panchayat' && (!input.provenance.boundarySource?.trim() || !input.featureRoles.includes('local'))) throw new Error('Panchayat input needs a boundary source and independently sourced local covariates.');
    const periods = input.periods;
    for (const range of [periods?.training, periods?.validation]) {
        if (!Array.isArray(range) || range.length !== 2 || range.some(d => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) || range[0] > range[1]) throw new Error('Supply valid ISO date ranges.');
    }
    if (periods.validation[0] <= periods.training[1]) throw new Error('Validation must follow training without overlapping dates.');
    if (JSON.stringify(train.features) !== JSON.stringify(check.features) || train.rows.length !== check.rows.length) throw new Error('Periods must contain the same features in the same order and the same locations.');
    const lookup = new Map(check.rows.map(r => [r.id, r]));
    for (const r of train.rows) {
        const v = lookup.get(r.id);
        if (!v || v.block !== r.block || Math.abs(v.latitude - r.latitude) > 1e-5 || Math.abs(v.longitude - r.longitude) > 1e-5) throw new Error('Location IDs, groups and coordinates must match across periods.');
    }
    const groups = new Map<string, number>(); train.rows.forEach(r => groups.set(r.block, (groups.get(r.block) || 0) + 1));
    if (groups.size < 2 || [...groups.values()].some(n => n < 3)) throw new Error('Provide at least two declared groups with at least three locations each. Do not invent administrative memberships.');
}

export function analyzeContrast(input: ContrastInput, settings: ContrastSettings) {
    validateContrast(input, settings);
    // Sorting IDs keeps deterministic initializations independent of upload row order.
    const rows = [...input.training.rows].sort((a, b) => a.id.localeCompare(b.id));
    const lookup = new Map(input.validation.rows.map(r => [r.id, r]));
    const later = rows.map(r => lookup.get(r.id)!);
    const p = input.training.features.length, n = rows.length, groups = rows.map(r => r.block);
    const means = Array.from({ length: p }, (_, j) => average(rows.map(r => r.values[j])));
    const scales = means.map((m, j) => Math.sqrt(rows.reduce((s, r) => s + (r.values[j] - m) ** 2, 0) / (n - 1)));
    const standardize = (values: number[]) => values.map((v, j) => scales[j] > 1e-12 ? (v - means[j]) / scales[j] : 0);
    const z = rows.map(r => standardize(r.values)), zv = later.map(r => standardize(r.values));
    const methods = [
        { id: 'standard', name: 'Standard PCA', alpha: 0, reliability: Array(p).fill(1) as number[] },
        { id: 'weighted', name: 'Reliability-weighted PCA', alpha: 0, reliability: input.reliability },
        { id: 'contrast', name: 'Within-group contrast PCA', alpha: settings.alpha, reliability: input.reliability },
    ];
    const fits = methods.map(method => {
        const weight = (row: number[]) => row.map((v, j) => v * Math.sqrt(method.reliability[j]));
        const x = z.map(weight), xv = zv.map(weight), within = centeredWithin(x, groups);
        const totalCov = covariance(x, n - 1), withinCov = covariance(within, n - new Set(groups).size);
        const totalTrace = trace(totalCov), withinTrace = trace(withinCov);
        if (totalTrace < 1e-12) throw new Error('No usable variance remains after reliability weighting.');
        // With no local contrast, fall back to total covariance and block the resolution gate.
        const effectiveAlpha = withinTrace < 1e-12 ? 0 : method.alpha;
        const objective = totalCov.map((r, j) => r.map((v, k) => (1 - effectiveAlpha) * v / totalTrace + (effectiveAlpha ? effectiveAlpha * withinCov[j][k] / withinTrace : 0)));
        const eig = eigen(objective), basis = eig.slice(0, settings.components).map(e => e.vector);
        const project = (matrix: number[][]) => matrix.map(row => basis.map(v => dot(row, v)));
        const scores = project(x), validationScores = project(xv);
        const retained = (c: number[][], vectors = basis) => trace(c) < 1e-12 ? null : vectors.reduce((s, v) => s + dot(v, c.map(r => dot(r, v))), 0) / trace(c);
        const commonBasis: number[][] = [];
        for (const v of basis) {
            let u = weight(v);
            for (const previous of commonBasis) { const projection = dot(u, previous); u = u.map((x, j) => x - projection * previous[j]); }
            const norm = Math.sqrt(dot(u, u));
            if (norm > 1e-10) commonBasis.push(u.map(x => x / norm));
        }
        const originalWithin = covariance(centeredWithin(z, groups), n - new Set(groups).size);
        // Subspace retention in a common, unweighted standardized space is comparable across methods.
        const totalRetention = retained(covariance(z, n - 1), commonBasis);
        const withinRetention = retained(originalWithin, commonBasis);
        const candidates = Array.from({ length: settings.maxK - 1 }, (_, i) => i + 2).map(k => {
            const labels = kmeans(scores, k, 16);
            const ids = [...new Set(labels)], sizes = ids.map(id => labels.filter(c => c === id).length);
            const centers = ids.map(id => scores[0].map((_, j) => average(scores.filter((_, i) => labels[i] === id).map(row => row[j]))));
            const validationLabels = validationScores.map(row => {
                const distances = centers.map(center => distance(row, center));
                return ids[distances.indexOf(Math.min(...distances))];
            });
            const validationSizes = ids.map(id => validationLabels.filter(c => c === id).length);
            const stabilityARI = adjustedRand(labels, validationLabels);
            const reasons: string[] = [];
            if (ids.length !== k) reasons.push('Fewer distinct groups than requested');
            if (Math.min(...sizes, ...validationSizes) < 2) reasons.push('Singleton or empty group in one period');
            if (withinTrace < 1e-12) reasons.push('No within-group input contrast');
            if (withinRetention === null || withinRetention < .5) reasons.push('Common-space within-group retention below 50%');
            if (stabilityARI < .65) reasons.push('Temporal assignment ARI below 0.65');
            const pointAgreement = labels.map((a, i) => {
                let intersection = 0, union = 0;
                labels.forEach((b, j) => { if (i !== j) { const before = a === b, after = validationLabels[i] === validationLabels[j]; if (before || after) union++; if (before && after) intersection++; } });
                return union ? intersection / union : 0;
            });
            return { k, labels, validationLabels, sizes, validationSizes, stabilityARI, pointAgreement, eligible: !reasons.length, reasons,
                training: clusterMetrics(z, labels), validationFixedLabels: clusterMetrics(zv, labels) };
        });
        // Prefer the finest candidate that passes the stated exploratory gates; never force an answer.
        const selected = [...candidates].reverse().find(c => c.eligible) ?? null;
        return { id: method.id, name: method.name, alpha: method.alpha, effectiveAlpha, reliability: method.reliability, objective, basis, commonBasis, eigenvalues: eig.map(e => e.value), scores, totalRetention, withinRetention, weightedWithinRetention: retained(withinCov), candidates, selectedK: selected?.k ?? null };
    });
    return { schemaVersion: 1, methodVersion: 'contrast-prototype-0.1', status: 'experimental-not-patent-validated', settings, scope: input.scope, provenance: input.provenance, periods: input.periods, featureRoles: input.featureRoles, features: input.training.features,
        locations: rows.map(r => ({ id: r.id, name: r.name, group: r.block })), scaler: { means, scales }, fits,
        warnings: [input.scope === 'research-grid' ? 'Analyst-defined grid groups are not administrative blocks or panchayats.' : 'Boundary and source declarations are user-supplied; no independent administrative verification is performed.',
            'This is exploratory validation used for resolution selection, not an untouched test or a forecast-accuracy result.',
            'Common-space retention uses an orthonormal basis for the effective loadings in unweighted standardized coordinates; weighted-space retention is reported separately.',
            'Reliability weights are declared feature weights, not calibrated probabilities. No values are imputed.',
            'Temporal ARI measures assignment persistence, not bootstrap uncertainty. Static local covariates can inflate persistence.',
            'Panchayat microclimate relevance, spatial generalization, novelty and patent eligibility remain unverified.'],
        gates: { minGroupSize: 2, minTemporalARI: .65, minWithinRetention: .5, policy: 'Largest k passing all exploratory gates; otherwise unresolved. Not a hierarchical split/merge implementation.' } };
}
export type ContrastResult = ReturnType<typeof analyzeContrast>;
