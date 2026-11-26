import { requireAppUser } from './account-auth';
export const dynamic = 'force-dynamic';
import Workspace from './workspace';
import { analyze, type Dataset, type Settings } from '@/lib/climate/engine';
import training from '@/public/research/train.json';
import benchmark from '@/public/research/benchmark.json';
export default async function Home() { const user = await requireAppUser(); const dataset = training as Dataset; return <Workspace user={user} initialData={dataset} initialResult={analyze(dataset, benchmark.activeConfig as Settings)}/>; }
