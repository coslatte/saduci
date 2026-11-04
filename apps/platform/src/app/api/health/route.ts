import { NextResponse } from "next/server";
import { resolveCoreApiUrl } from "@/lib/apiProxy";
import { SERVER_PROBE_TIMEOUT_MS } from "@/lib/serverAvailability";

// La sonda debe responder siempre en fresco: si Next la tratara como
// estática, el banner podría quedarse atascado en un 502 cacheado.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight backend reachability probe for the client-side retry policy.
 * Answers fast (short timeout) so the login flow can detect a dead backend
 * without waiting for the longer upstream timeouts of the auth routes.
 */
export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERVER_PROBE_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${resolveCoreApiUrl()}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ reachable: false }, { status: 502 });
    }
    return NextResponse.json({ reachable: true });
  } catch {
    return NextResponse.json({ reachable: false }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
