import { analyze, clusterMetrics, validate, type Analysis, type Dataset, type Settings } from './engine.ts';

export function evaluateFixedMembership(training: Dataset, evaluation: Dataset, fitted: Analysis) {
    validate(evaluation);
    if (JSON.stringify(training.features) !== JSON.stringify(evaluation.features)) throw new Error('Evaluation features must match training names and order.');
    if (training.rows.length !== evaluation.rows.length) throw new Error('Fixed-membership evaluation requires the same locations.');
    const byId = new Map(evaluation.rows.map(row => [row.id, row]));
    const x = training.rows.map(row => {
        const other = byId.get(row.id);
        if (!other || Math.abs(other.latitude - row.latitude) > 1e-5 || Math.abs(other.longitude - row.longitude) > 1e-5) throw new Error('Evaluation locations do not match the training grid.');
        return other.values.map((v, j) => fitted.scales[j] < 1e-12 ? 0 : (v - fitted.means[j]) / fitted.scales[j]);
    });
    return clusterMetrics(x, fitted.labels);
}

export function verifyBenchmark(training: Dataset, evaluation: Dataset, baseline: Settings, candidate: Settings) {
    const base = analyze(training, baseline), selected = analyze(training, candidate);
    return {
        baseline: evaluateFixedMembership(training, evaluation, base),
        candidate: evaluateFixedMembership(training, evaluation, selected),
        baselineLabels: base.labels,
        candidateLabels: selected.labels,
        protocol: 'Frozen 2025 training memberships; 2026 profiles transformed using training statistics only',
        locations: training.rows.length,
    };
}
