import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Simple comment: Parse PDF bytes to text using pdf-parse (handle CJS/ESM default)
async function parsePdf(buffer: Buffer): Promise<{ text: string; numPages?: number }> {
  const mod: any = await import('pdf-parse');
  const pdfParse = (mod?.default || mod) as (buf: Buffer) => Promise<any>;
  const res = await pdfParse(buffer);
  const pages = res.numpages ?? res.numPages;
  return { text: res.text || '', numPages: pages };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 415 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
    }

    // Some environments may not set a precise file.type; accept by extension as fallback
    const name = file.name || '';
    const looksPdfByName = name.toLowerCase().endsWith('.pdf');
    if (file.type !== 'application/pdf' && !looksPdfByName) {
      return NextResponse.json({ error: 'Only application/pdf is allowed' }, { status: 415 });
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text, numPages } = await parsePdf(buffer);
    const cleaned = (text || '').replace(/\u0000/g, '').trim();

    // Optional soft truncation to avoid massive payloads
    const hardLimit = 200_000; // 200k chars safeguard
    const truncated = cleaned.length > hardLimit;
    const finalText = truncated ? cleaned.slice(0, hardLimit) : cleaned;

    return NextResponse.json({
      success: true,
      text: finalText,
      meta: {
        name: file.name,
        size: file.size,
        type: file.type,
        numPages: numPages ?? null,
        truncated,
      },
    });
  } catch (err: any) {
    console.error('extract-pdf-text error:', err);
    const message = typeof err?.message === 'string' ? err.message : 'Failed to parse PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


