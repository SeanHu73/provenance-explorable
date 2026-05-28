/**
 * Server-side proxy for Firebase Storage uploads.
 *
 * The browser POSTs a multipart/form-data body with { file, kind } here.
 * This route forwards the file to Firebase Storage's REST API from the
 * server, which bypasses CORS entirely (CORS only applies to browser
 * cross-origin requests, not server-to-server).
 *
 * Returns a JSON { url } the client stores on the stop document.
 *
 * Storage rules govern who can write — currently `allow if true` until
 * 2026-06-26 in the project. Tighten those rules (not this route)
 * before public launch.
 *
 * Vercel free-tier request body cap: ~4.5 MB. Photos and short audio
 * fit easily; long-form audio (>5 min HQ) may not.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_KINDS = new Set(['photo', 'audio']);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const kind = form.get('kind');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }

    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured' },
        { status: 500 },
      );
    }

    const safeName = (file.name || 'file').replace(/[^a-z0-9.\-_]/gi, '_');
    const path = `explorable/${kind}/${Date.now()}_${safeName}`;
    const contentType = file.type || 'application/octet-stream';

    const uploadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o` +
      `?name=${encodeURIComponent(path)}&uploadType=media`;

    const buffer = await file.arrayBuffer();
    const fbRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: buffer,
    });

    if (!fbRes.ok) {
      const errText = await fbRes.text().catch(() => '');
      console.error(
        `[api/explorable/upload] Firebase rejected (${fbRes.status}):`,
        errText.slice(0, 500),
      );
      return NextResponse.json(
        {
          error: `Firebase Storage refused the upload (${fbRes.status}).`,
          details: errText.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await fbRes.json()) as {
      name?: string;
      downloadTokens?: string;
    };

    if (!data.downloadTokens) {
      console.error('[api/explorable/upload] No downloadTokens in response', data);
      return NextResponse.json(
        { error: 'Firebase did not return a download token.' },
        { status: 502 },
      );
    }

    const downloadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/` +
      `${encodeURIComponent(path)}?alt=media&token=${data.downloadTokens}`;

    return NextResponse.json({ url: downloadUrl, path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/explorable/upload] Unexpected error:', msg);
    return NextResponse.json(
      { error: `Internal error: ${msg}` },
      { status: 500 },
    );
  }
}
