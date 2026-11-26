export type RecordRow = {
    id: string;
    name: string;
    block: string;
    latitude: number;
    longitude: number;
    values: number[];
};
export type Dataset = {
    name: string;
    source: 'synthetic' | 'uploaded' | 'gfs';
    provenance?: { provider: string; period: string; unit: string; hourlyRecords: number; sha256: string; notes: string[] };
    features: string[];
    rows: RecordRow[];
};
export type Settings = {
    algorithm: 'kmeans' | 'agglomerative' | 'dbscan';
    variance: number;
    k: number;
    eps: number;
    minPts: number;
    reduction?: 'pca' | 'none';
    starts?: number;
};
export const defaults: Settings = { algorithm: 'kmeans', variance: 90, k: 4, eps: 1.2, minPts: 4 };
export const featureLabels: Record<string, string> = { temperature_c: 'Temperature (°C)', rainfall_mm: 'Rainfall (mm)', humidity_pct: 'Humidity (%)', wind_ms: 'Wind (m/s)', pressure_hpa: 'Pressure (hPa)', solar_wm2: 'Solar radiation (W/m²)', elevation_m: 'Elevation (m)', slope_deg: 'Slope (°)', vegetation_index: 'Vegetation index', water_distance_km: 'Water distance (km)', builtup_pct: 'Built-up area (%)', soil_moisture: 'Soil moisture' };
export const label = (s: string) => featureLabels[s] || s.replaceAll('_', ' ');
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sqdist = (a: number[], b: number[]) => a.reduce((s, x, j) => s + (x - b[j]) ** 2, 0);
export function demoData(): Dataset {
    let seed = 24831;
    const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    const rows: RecordRow[] = Array.from({ length: 72 }, (_, i) => {
        const group = Math.floor(i / 18), u = random(), v = random();
        const elevation = [310, 520, 280, 365][group] + 45 * u;
        return { id: `DEMO-${String(i + 1).padStart(3, '0')}`, name: `Panchayat ${String(i + 1).padStart(2, '0')}`, block: `Demo block ${['A', 'B', 'C', 'D'][group]}`, latitude: 31.05 + [0.07, 0.30, 0.05, 0.27][group] + v * .16, longitude: 75.40 + [0.05, 0.12, 0.33, 0.39][group] + u * .14, values: [[29.5, 24.2, 31.8, 27.5][group] + random() * 2, [115, 230, 65, 155][group] + random() * 55, [68, 79, 49, 65][group] + random() * 8, [2.1, 3.8, 2.8, 3.2][group] + random(), 1011 - elevation * .09 + random() * 2, [210, 165, 265, 230][group] + random() * 30, elevation, [2, 12, 1, 5][group] + random() * 4, [.66, .78, .27, .48][group] + random() * .12, [.5, 3, 7, 4][group] + random() * 2, [12, 5, 49, 24][group] + random() * 8, [.31, .39, .14, .25][group] + random() * .07].map(n => +n.toFixed(3)) };
    });
    return { name: 'Punjab foothills · synthetic pilot', source: 'synthetic', features: Object.keys(featureLabels), rows };
}
// Quoted cells can contain commas and line breaks.
export function parseCSV(text: string, name: string): Dataset {
    if (text.length > 500000)
        throw new Error('CSV must be smaller than 500 KB.');
    const table: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (ch === ',' && !quoted) {
            row.push(cell.trim());
            cell = '';
        }
        else if ((ch === '\n' || ch === '\r') && !quoted) {
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            row.push(cell.trim());
            if (row.some(Boolean))
                table.push(row);
            row = [];
            cell = '';
        }
        else
            cell += ch;
    }
    if (quoted)
        throw new Error('A quoted CSV cell was not closed.');
    row.push(cell.trim());
    if (row.some(Boolean))
        table.push(row);
    const headers = table.shift();
    if (!headers || new Set(headers).size !== headers.length)
        throw new Error('CSV needs unique column names.');
    const required = ['id', 'name', 'block', 'latitude', 'longitude'];
    for (const h of required)
        if (!headers.includes(h))
            throw new Error(`Missing required column: ${h}. Download the template to see the format.`);
    const features = headers.filter(h => !required.includes(h));
    if (features.some(isLabelColumn)) throw new Error('Remove cluster or target label columns before uploading. Labels must not be input features.');
    const rows = table.map((cells, i) => {
        if (cells.length !== headers.length)
            throw new Error(`Row ${i + 2} has ${cells.length} cells; expected ${headers.length}.`);
        const get = (key: string) => cells[headers.indexOf(key)];
        for (const h of headers)
            if (!get(h))
                throw new Error(`Row ${i + 2}: ${h} is empty. Fill missing values before upload.`);
        return { id: get('id'), name: get('name'), block: get('block'), latitude: Number(get('latitude')), longitude: Number(get('longitude')), values: features.map(h => Number(get(h))) };
    });
    const data: Dataset = { name: name.slice(0, 100), source: 'uploaded', features, rows };
    validate(data);
    return data;
}
const isLabelColumn = (name: string) => /^(cluster([_ -]?(id|label))?|target|label|prediction|predicted[_ -]?cluster)$/i.test(name.trim());
export function validate(data: Dataset) {
    if (!data || typeof data.name !== 'string' || !['synthetic', 'uploaded', 'gfs'].includes(data.source) || !Array.isArray(data.features) || !Array.isArray(data.rows))
        throw new Error('Invalid dataset format.');
    if (data.rows.length < 6 || data.rows.length > 300)
        throw new Error('Use 6–300 location profiles per analysis.');
    if (data.features.length < 2 || data.features.length > 20 || new Set(data.features).size !== data.features.length || data.features.some(f => typeof f !== 'string' || !f.trim() || f.length > 80))
        throw new Error('Provide 2–20 unique numeric feature columns.');
    if (data.features.some(isLabelColumn)) throw new Error('Remove cluster or target label columns before analysis.');
    if (new Set(data.rows.map(r => r.id)).size !== data.rows.length)
        throw new Error('Each location needs a unique ID. Use one summary row per location.');
    for (const r of data.rows) {
        if (![r.id, r.name, r.block].every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 150) || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude) || Math.abs(r.latitude) > 90 || Math.abs(r.longitude) > 180 || !Array.isArray(r.values) || r.values.length !== data.features.length || r.values.some(x => !Number.isFinite(x) || Math.abs(x) > 1e9))
            throw new Error('Check names, coordinates and numeric features. Missing or non-finite values are not accepted.');
    }
}
export function eigen(cov: number[][]) {
    const n = cov.length, a = cov.map(r => [...r]), vectors: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
    // Jacobi rotations preserve symmetry and work well for these small matrices.
    for (let t = 0; t < 100 * n * n; t++) {
        let p = 0, q = 1, max = 0;
        for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++)
                if (Math.abs(a[i][j]) > max) {
                    max = Math.abs(a[i][j]);
                    p = i;
                    q = j;
                }
        if (max < 1e-10)
            break;
        const angle = .5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(angle), s = Math.sin(angle);
        const pp = a[p][p], qq = a[q][q], pq = a[p][q];
        a[p][p] = c * c * pp - 2 * s * c * pq + s * s * qq;
        a[q][q] = s * s * pp + 2 * s * c * pq + c * c * qq;
        a[p][q] = a[q][p] = 0;
        for (let k = 0; k < n; k++) {
            if (k !== p && k !== q) {
                const kp = a[k][p], kq = a[k][q];
                a[k][p] = a[p][k] = c * kp - s * kq;
                a[k][q] = a[q][k] = s * kp + c * kq;
            }
            const vp = vectors[k][p], vq = vectors[k][q];
            vectors[k][p] = c * vp - s * vq;
            vectors[k][q] = s * vp + c * vq;
        }
    }
    return Array.from({ length: n }, (_, j) => ({ value: Math.max(0, a[j][j]), vector: vectors.map(r => r[j]) })).sort((a, b) => b.value - a.value);
}
function kmeansSingle(x: number[][], k: number, start: number) {
    const centers = [x[start].slice()];
    while (centers.length < k) {
        const distances = x.map(r => Math.min(...centers.map(c => sqdist(r, c))));
        centers.push(x[distances.indexOf(Math.max(...distances))].slice());
    }
    let labels = x.map(() => -1);
    for (let step = 0; step < 100; step++) {
        const next = x.map(r => { const d = centers.map(c => sqdist(r, c)); return d.indexOf(Math.min(...d)); });
        if (next.every((v, i) => v === labels[i]))
            break;
        labels = next;
        centers.forEach((_, c) => { const group = x.filter((_, i) => labels[i] === c); if (group.length)
            centers[c] = x[0].map((_, j) => mean(group.map(r => r[j]))); });
    }
    return labels;
}
export function kmeans(x: number[][], k: number, starts = 1) {
    let best: number[] = [], bestInertia = Infinity;
    for (let start = 0; start < Math.min(starts, x.length); start++) {
        const labels = kmeansSingle(x, k, start);
        const inertia = [...new Set(labels)].reduce((sum, id) => {
            const group = x.filter((_, i) => labels[i] === id);
            const center = x[0].map((_, j) => mean(group.map(row => row[j])));
            return sum + group.reduce((s, row) => s + sqdist(row, center), 0);
        }, 0);
        if (inertia < bestInertia) { bestInertia = inertia; best = labels; }
    }
    return best;
}

// All model comparisons use this same distance space and exclude noise explicitly.
export function clusterMetrics(x: number[][], labels: number[]) {
    const assigned = labels.map((c, i) => c >= 0 ? i : -1).filter(i => i >= 0);
    const ids = [...new Set(assigned.map(i => labels[i]))];
    if (ids.length < 2 || ids.length >= assigned.length) return { silhouette: null, daviesBouldin: null };
    const groups = ids.map(id => assigned.filter(i => labels[i] === id));
    const silhouette = mean(assigned.map(i => {
        const own = groups[ids.indexOf(labels[i])].filter(j => j !== i);
        if (!own.length) return 0;
        const a = mean(own.map(j => Math.sqrt(sqdist(x[i], x[j]))));
        const b = Math.min(...groups.filter((_, j) => ids[j] !== labels[i]).map(g => mean(g.map(j => Math.sqrt(sqdist(x[i], x[j]))))));
        return Math.max(a, b) ? (b - a) / Math.max(a, b) : 0;
    }));
    const centers = groups.map(g => x[0].map((_, j) => mean(g.map(i => x[i][j]))));
    const scatter = groups.map((g, c) => mean(g.map(i => Math.sqrt(sqdist(x[i], centers[c])))));
    const db = mean(centers.map((c, i) => Math.max(...centers.flatMap((d, j) => {
        if (i === j) return [];
        const distance = Math.sqrt(sqdist(c, d));
        return [distance > 1e-12 ? (scatter[i] + scatter[j]) / distance : Infinity];
    }))));
    return { silhouette, daviesBouldin: Number.isFinite(db) ? db : null };
}
function agglomerative(x: number[][], k: number) {
    const n = x.length, distances = x.map(a => x.map(b => Math.sqrt(sqdist(a, b)))), groups = x.map((_, i) => [i]);
    const active = new Set(Array.from({ length: n }, (_, i) => i));
    while (active.size > k) {
        let a = -1, b = -1, min = Infinity;
        const ids = [...active];
        for (let i = 0; i < ids.length; i++)
            for (let j = i + 1; j < ids.length; j++)
                if (distances[ids[i]][ids[j]] < min) {
                    a = ids[i];
                    b = ids[j];
                    min = distances[a][b];
                }
        for (const c of active)
            if (c !== a && c !== b)
                distances[a][c] = distances[c][a] = (distances[a][c] * groups[a].length + distances[b][c] * groups[b].length) / (groups[a].length + groups[b].length);
        groups[a].push(...groups[b]);
        active.delete(b);
    }
    const labels = x.map(() => 0);
    [...active].forEach((id, c) => groups[id].forEach(i => labels[i] = c));
    return labels;
}
function dbscan(x: number[][], eps: number, minPts: number) {
    const labels = x.map(() => -2);
    let cluster = 0;
    const neighbors = (i: number) => x.map((r, j) => sqdist(r, x[i]) <= eps * eps ? j : -1).filter(j => j >= 0);
    for (let i = 0; i < x.length; i++) {
        if (labels[i] !== -2)
            continue;
        const near = neighbors(i);
        if (near.length < minPts) {
            labels[i] = -1;
            continue;
        }
        labels[i] = cluster;
        const queue = new Set(near);
        for (const j of queue) {
            if (labels[j] === -1)
                labels[j] = cluster;
            if (labels[j] !== -2)
                continue;
            labels[j] = cluster;
            const more = neighbors(j);
            if (more.length >= minPts)
                more.forEach(q => queue.add(q));
        }
        cluster++;
    }
    return labels;
}
export function analyze(data: Dataset, settings: Settings) {
    validate(data);
    if ((settings?.starts !== undefined && (!Number.isInteger(settings.starts) || settings.starts < 1 || settings.starts > 16)) || (settings?.reduction !== undefined && !['pca', 'none'].includes(settings.reduction))) throw new Error('Invalid analysis settings.');
    if (!settings || !['kmeans', 'agglomerative', 'dbscan'].includes(settings.algorithm) || !Number.isInteger(settings.k) || settings.k < 2 || settings.k > 8 || settings.k >= data.rows.length || !Number.isFinite(settings.variance) || settings.variance < 50 || settings.variance > 100 || !Number.isFinite(settings.eps) || settings.eps < .1 || settings.eps > 10 || !Number.isInteger(settings.minPts) || settings.minPts < 2 || settings.minPts > 20)
        throw new Error('Invalid analysis settings.');
    const x = data.rows.map(r => r.values), n = x.length, p = data.features.length;
    const means = x[0].map((_, j) => mean(x.map(r => r[j]))), scales = means.map((m, j) => Math.sqrt(x.reduce((s, r) => s + (r[j] - m) ** 2, 0) / (n - 1)));
    const constant = data.features.filter((_, j) => scales[j] < 1e-12);
    if (constant.length === p)
        throw new Error('All features are constant. PCA needs variation between panchayats.');
    const z = x.map(r => r.map((v, j) => scales[j] < 1e-12 ? 0 : (v - means[j]) / scales[j]));
    const cov = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => z.reduce((s, r) => s + r[i] * r[j], 0) / (n - 1)));
    const eig = eigen(cov), total = eig.reduce((s, e) => s + e.value, 0), ratios = eig.map(e => e.value / total);
    let components = 1;
    while (components < p && ratios.slice(0, components).reduce((s, v) => s + v, 0) < settings.variance / 100 - 1e-10)
        components++;
    const scores = z.map(r => eig.map(e => r.reduce((s, v, j) => s + v * e.vector[j], 0))), reduced = settings.reduction === 'none' ? z : scores.map(r => r.slice(0, components));
    if (settings.reduction === 'none') components = p;
    if (settings.algorithm !== 'dbscan' && new Set(reduced.map(r => JSON.stringify(r))).size < settings.k) throw new Error('Fewer distinct feature profiles than requested clusters. Reduce k or check duplicated grid cells.');
    const labels = settings.algorithm === 'kmeans' ? kmeans(reduced, settings.k, settings.starts ?? 1) : settings.algorithm === 'agglomerative' ? agglomerative(reduced, settings.k) : dbscan(reduced, settings.eps, settings.minPts);
    const ids = [...new Set(labels)].filter(c => c >= 0).sort((a, b) => a - b);
    const clusters = ids.map(id => { const indices = labels.map((c, i) => c === id ? i : -1).filter(i => i >= 0); return { id, count: indices.length, means: means.map((_, j) => mean(indices.map(i => x[i][j]))), center: reduced[0].map((_, j) => mean(indices.map(i => reduced[i][j]))) }; });
    let silhouette: number | null = null;
    const assigned = labels.map((c, i) => c >= 0 ? i : -1).filter(i => i >= 0);
    if (ids.length >= 2 && ids.length < assigned.length) {
        silhouette = mean(assigned.map(i => { const own = assigned.filter(j => labels[j] === labels[i] && j !== i); if (!own.length)
            return 0; const a = mean(own.map(j => Math.sqrt(sqdist(reduced[i], reduced[j])))); const b = Math.min(...ids.filter(c => c !== labels[i]).map(c => mean(assigned.filter(j => labels[j] === c).map(j => Math.sqrt(sqdist(reduced[i], reduced[j])))))); return Math.max(a, b) ? (b - a) / Math.max(a, b) : 0; }));
    }
    let daviesBouldin: number | null = null;
    if (clusters.length > 1) {
        const scatter = clusters.map(c => mean(assigned.filter(i => labels[i] === c.id).map(i => Math.sqrt(sqdist(reduced[i], c.center)))));
        const value = mean(clusters.map((c, i) => Math.max(...clusters.filter(d => d.id !== c.id).map(d => { const j = clusters.indexOf(d), dist = Math.sqrt(sqdist(c.center, d.center)); return dist > 1e-12 ? (scatter[i] + scatter[j]) / dist : Infinity; }))));
        if (Number.isFinite(value))
            daviesBouldin = value;
    }
    const common = clusterMetrics(z, labels);
    const duplicateProfiles = n - new Set(x.map(r => JSON.stringify(r))).size;
    const duplicateCoordinates = n - new Set(data.rows.map(r => `${r.latitude},${r.longitude}`)).size;
    const singletonClusters = clusters.filter(c => c.count === 1).length;
    const warnings: string[] = [];
    if (n < 30) warnings.push('Small spatial sample: fewer than 30 locations. Treat separation scores as preliminary.');
    if (duplicateProfiles) warnings.push(`${duplicateProfiles} repeated weather profiles. Repeated grid values are not independent local evidence.`);
    if (duplicateCoordinates) warnings.push(`${duplicateCoordinates} repeated coordinates. Keep shared grid cells together in spatial splits.`);
    if (singletonClusters) warnings.push(`${singletonClusters} singleton cluster(s). A one-location group gives little evidence of a recurring pattern.`);
    if (common.silhouette !== null && common.silhouette < .25) warnings.push('Weak separation in the original feature space. Do not interpret these groups as established climate zones.');
    if (constant.length) warnings.push(`Constant columns contribute zero: ${constant.join(', ')}.`);
    if (data.source === 'synthetic') warnings.push('Synthetic demonstration: these scores are not real-weather performance.');
    return { settings, components, ratios, retained: ratios.slice(0, components).reduce((s, v) => s + v, 0), loadings: eig.map(e => e.vector), scores, labels, clusters, silhouette, daviesBouldin, commonSilhouette: common.silhouette, commonDaviesBouldin: common.daviesBouldin, metricSpace: 'Original features, sample-standardized on this dataset', warnings, duplicateProfiles, duplicateCoordinates, singletonClusters, noise: labels.filter(c => c === -1).length, constant, means, scales, rows: n, features: p };
}
export type Analysis = ReturnType<typeof analyze>;
export function toCSV(data: Dataset, labels?: number[]) {
    const escape = (v: unknown) => { let s = String(v); if (/^[=+@\t\r]/.test(s) || (/^\-/.test(s) && !Number.isFinite(Number(s))))
        s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
    return [['id', 'name', 'block', 'latitude', 'longitude', ...data.features, ...(labels ? ['cluster'] : [])], ...data.rows.map((r, i) => [r.id, r.name, r.block, r.latitude, r.longitude, ...r.values, ...(labels ? [labels[i] === -1 ? 'noise' : labels[i] + 1] : [])])].map(r => r.map(escape).join(',')).join('\r\n');
}
