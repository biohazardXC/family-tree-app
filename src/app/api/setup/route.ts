import { NextResponse } from "next/server";
import { runSetup } from "@/db/setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One-time database setup for a freshly deployed instance.
 *
 *   GET /api/setup?key=<SETUP_KEY>
 *
 * Creates the tables and seeds the demo family if the database is empty.
 * Safe to call more than once. Requires the SETUP_KEY environment variable
 * so that a stranger can't trigger it.
 */
export async function GET(req: Request) {
  const expected = process.env.SETUP_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SETUP_KEY is not set on the server. Add it in your hosting provider's environment variables and redeploy.",
      },
      { status: 503 }
    );
  }

  const provided = new URL(req.url).searchParams.get("key")?.trim();
  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "Wrong or missing setup key." },
      { status: 401 }
    );
  }

  try {
    const result = await runSetup();
    return NextResponse.json({
      ok: true,
      people: result.people,
      seeded: result.seeded,
      messages: result.messages,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
