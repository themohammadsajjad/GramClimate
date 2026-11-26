import { analyze } from '@/lib/climate/engine';
export async function POST(request: Request) {
    try {
        if (Number(request.headers.get('content-length')) > 500000)
            return Response.json({ error: 'Dataset exceeds 500 KB.' }, { status: 413 });
        const reader = request.body?.getReader();
        if (!reader)
            return Response.json({ error: 'Dataset is required.' }, { status: 400 });
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const part = await reader.read();
            if (part.done)
                break;
            size += part.value.length;
            if (size > 500000) {
                await reader.cancel();
                return Response.json({ error: 'Dataset exceeds 500 KB.' }, { status: 413 });
            }
            chunks.push(part.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        const { dataset, settings } = JSON.parse(new TextDecoder().decode(bytes));
        return Response.json(analyze(dataset, settings), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : 'Analysis failed.' }, { status: 400 });
    }
}
