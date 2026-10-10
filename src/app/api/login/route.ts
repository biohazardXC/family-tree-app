import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/middleware";

export const dynamic = "force-dynamic";

/** Exchanges the admin password for a cookie. */
export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "No admin password is set on the server yet." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (typeof body.password !== "string" || body.password !== password) {
    // Deliberately vague, and no hint about length or format.
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days — this is a family tree, not a bank
  });
  return res;
}

/** Signs out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
