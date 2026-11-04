import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/sessionCookie";

/**
 * Clears the session cookie. The client also drops its localStorage mirror,
 * but the cookie is what the server reads, so it has to be expired here;
 * otherwise a reload would resurrect a session the user just closed.
 */
export async function POST() {
  return clearSessionCookie(
    NextResponse.json({ message: "Sesión cerrada" }, { status: 200 }),
  );
}
