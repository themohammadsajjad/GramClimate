import { verifyBenchmark } from '@/lib/climate/evaluation';
import type { Dataset, Settings } from '@/lib/climate/engine';
import train from '@/public/research/train.json';
import test from '@/public/research/test.json';
import benchmark from '@/public/research/benchmark.json';

export async function GET() {
    const result = verifyBenchmark(train as Dataset, test as Dataset, benchmark.baselineConfig as Settings, benchmark.selected.config as Settings);
    const tolerance = 1e-8;
    const matches = result.baseline.silhouette !== null && result.candidate.silhouette !== null &&
        Math.abs(result.baseline.silhouette - benchmark.test.baseline) < tolerance &&
        Math.abs(result.candidate.silhouette - benchmark.test.candidate) < tolerance;
    return Response.json({ ...result, matchesSavedReport: matches, verifiedAt: new Date().toISOString() }, {
        status: matches ? 200 : 409,
        headers: { 'Cache-Control': 'no-store' },
    });
}
