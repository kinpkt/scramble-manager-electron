import { NextResponse } from 'next/server';
import WCIFProcessor from '@/lib/WCIFProcessor';
import type { Competition } from '@/lib/Structures';
import fs from 'fs';

export async function POST(request: Request)
{
    const formData = await request.formData();
    const rawWCIF = formData.get('wcif');
    if (!rawWCIF || typeof rawWCIF !== 'string') 
    {
        return NextResponse.json({ error: 'Missing WCIF' }, { status: 400 });
    }

    const wcif: Competition = JSON.parse(rawWCIF);

    const file = formData.get('file') as File | null;
    if (!file) 
    {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const { exportZipPath } = await WCIFProcessor(wcif, file);

    if (!exportZipPath) {
        return NextResponse.json({ error: 'Failed to generate ZIP' }, { status: 500 });
    }

    const zipBuffer = fs.readFileSync(exportZipPath);

    return new Response(zipBuffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${wcif.name} - Organized Scrambles.zip"`
        }
    });
}