/**
 * Server-side proxy for Firebase Storage uploads.
 *
 * Tries each plausible bucket name (the .firebasestorage.app form and
 * the legacy .appspot.com form) in turn. If both return 404, surfaces
 * a hint that Storage probably isn't initialised for the project.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_KINDS = new Set(['photo', 'audio']);

function candidateBuckets(): string[] {
  const explicit = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
  const out: string[] = [];
  if (explicit) out.push(explicit);
  // Legacy naming many GCS-backed Firebase buckets actually use under
  // the hood, even when the SDK config shows .firebasestorage.app.
  if (project) {
    const legacy = `${project}.appspot.com`;
    if (!out.includes(legacy)) out.push(legacy);
  }
  // Also try .firebasestorage.app derived from project, in case env
  // has something different.
  if (project) {
    const modern = `${project}.firebasestorage.app`;
    if (!out.includes(modern)) out.push(modern);
  }
  return out;
}

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

    const buckets = candidateBuckets();
    if (buckets.length === 0) {
      return NextResponse.json(
        { error: 'Neither NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET nor NEXT_PUBLIC_FIREBASE_PROJECT_ID is set.' },
        { status: 500 },
      );
    }

    const safeName = (file.name || 'file').replace(/[^a-z0-9.\-_]/gi, '_');
    const path = `explorable/${kind}/${Date.now()}_${safeName}`;
    const contentType = file.type || 'application/octet-stream';
    const buffer = await file.arrayBuffer();

    const attempts: { bucket: string; status: number; body: string }[] = [];

    for (const bucket of buckets) {
      const uploadUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o` +
        `?name=${encodeURIComponent(path)}&uploadType=media`;

      const fbRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: buffer,
      });

      if (fbRes.ok) {
        const data = (await fbRes.json()) as {
          name?: string;
          downloadTokens?: string;
        };
        if (!data.downloadTokens) {
          return NextResponse.json(
            { error: 'Firebase accepted the upload but did not return a download token.' },
            { status: 502 },
          );
        }
        const downloadUrl =
          `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/` +
          `${encodeURIComponent(path)}?alt=media&token=${data.downloadTokens}`;
        return NextResponse.json({ url: downloadUrl, path, bucketUsed: bucket });
      }

      const body = await fbRes.text().catch(() => '');
      attempts.push({ bucket, status: fbRes.status, body: body.slice(0, 300) });

      // If it's not a 404 (bucket-not-found), surface the actual error
      // immediately — no point trying the other names if the bucket
      // exists but rules/quota/etc. are the problem.
      if (fbRes.status !== 404) {
        return NextResponse.json(
          {
            error: `Firebase Storage refused the upload (${fbRes.status}).`,
            details: body.slice(0, 500),
            bucket,
          },
          { status: 502 },
        );
      }
    }

    // All candidates 404'd — most likely Storage isn't enabled on this
    // project, or the bucket name is something different from both
    // standard forms.
    return NextResponse.json(
      {
        error: 'No Firebase Storage bucket found.',
        details:
          'Tried these bucket names and all returned 404. Most likely Storage ' +
          "isn't initialised for this project — open Firebase Console → " +
          'Storage and click "Get started". If Storage IS already set up, ' +
          'copy the bucket name from the Console (the "gs://..." line) ' +
          'and update NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in Vercel env vars.',
        attempts,
      },
      { status: 502 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/explorable/upload] Unexpected error:', msg);
    return NextResponse.json(
      { error: `Internal error: ${msg}` },
      { status: 500 },
    );
  }
}
