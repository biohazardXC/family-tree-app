import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The browser already shrinks photos before sending them, so anything large
 * here is either an unshrunk upload or someone poking at the endpoint.
 */
const MAX_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Stores one photo and returns its public URL.
 *
 * In production that's Vercel Blob. With no blob token — i.e. a developer
 * running locally — it falls back to writing into `public/uploads`, so the
 * feature works without anyone having to set up cloud storage first.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No photo was sent" }, { status: 400 });
    }

    const ext = EXTENSIONS[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          error:
            `Unsupported image type "${file.type || "unknown"}". ` +
            "Please use a JPEG, PNG or WebP photo.",
        },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is too large" }, { status: 413 });
    }

    const name = `${randomUUID()}.${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`people/${name}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error("POST /api/upload failed:", err);
    const detail = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `Could not save the photo: ${detail}` }, { status: 500 });
  }
}
