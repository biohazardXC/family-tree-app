import { NextResponse, type NextRequest } from "next/server";

/**
 * Locks the admin side of the site behind one password.
 *
 * Until now every page was open to anyone with the address. An invitee who
 * clicked "Tree" landed in the full editor, with the demo bar offering to
 * reset the tree, and could reach /review and /people. `POST /api/demo`
 * with `reseed` deletes everyone, and nothing stopped a stranger calling it.
 *
 * What stays public, deliberately:
 *   /invite/<token>      the form relatives fill in
 *   /api/invite/<token>  loading and submitting that form
 *   /share               the read-only tree
 *   GET /api/tree        the data /share draws
 *
 * Everything else — the editor, the review queue, the people list, and every
 * write to the database — needs the admin cookie.
 */

export const ADMIN_COOKIE = "rooted-admin";

/** Pages a logged-out visitor may see. */
const PUBLIC_PAGES = [/^\/login$/, /^\/share$/, /^\/invite\/[^/]+$/];

/** APIs a logged-out visitor may call. */
const PUBLIC_APIS = [/^\/api\/login$/, /^\/api\/invite\/[^/]+(\/submit)?$/];

/** Hash the password so the cookie never carries it in the clear. */
export async function adminToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`rooted:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.ADMIN_PASSWORD;

  // No password configured: leave the site exactly as it was rather than
  // locking the owner out of their own tree. The login page says so.
  if (!password) return NextResponse.next();

  if (PUBLIC_PAGES.some((r) => r.test(pathname))) return NextResponse.next();
  if (PUBLIC_APIS.some((r) => r.test(pathname))) return NextResponse.next();

  // The read-only tree needs its data, but only to read it.
  if (pathname === "/api/tree" && req.method === "GET") return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie === (await adminToken(password))) return NextResponse.next();

  // An API call gets a clear refusal; a page gets sent to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Please sign in as the family tree's owner to do that." },
      { status: 401 }
    );
  }

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads).*)"],
};
