import { NextRequest, NextResponse } from "next/server";
import { resolveCoreApiUrl } from "@/lib/apiProxy";
import { SESSION_COOKIE } from "@/lib/session";

const CORE_API_URL = resolveCoreApiUrl();

async function getTokenFromHeader(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && candidate !== "null" && candidate !== "undefined") {
      return candidate;
    }
  }

  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const upstream = await fetch(`${CORE_API_URL}/admin/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const allowedRoles = ["ADMIN", "ESPECIALISTA", "MEDICO"];
    const requestedRole =
      typeof body.role === "string" && allowedRoles.includes(body.role)
        ? body.role
        : body.is_superuser
          ? "ADMIN"
          : "MEDICO";
    const upstreamBody = {
      email: body.email,
      username: body.username,
      password: body.password,
      role: requestedRole,
      is_active: body.is_active ?? true,
    };

    const upstream = await fetch(`${CORE_API_URL}/admin/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json(
      { error: "ID de usuario requerido" },
      { status: 400 },
    );
  }

  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const allowedRoles = ["ADMIN", "ESPECIALISTA", "MEDICO"];
    const upstreamBody: Record<string, unknown> = {};

    if (typeof body.username === "string") {
      upstreamBody.username = body.username;
    }
    if (typeof body.email === "string") {
      upstreamBody.email = body.email;
    }
    if (typeof body.role === "string" && allowedRoles.includes(body.role)) {
      upstreamBody.role = body.role;
    }
    if (typeof body.is_active === "boolean") {
      upstreamBody.is_active = body.is_active;
    }

    const upstream = await fetch(`${CORE_API_URL}/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json(
      { error: "ID de usuario requerido" },
      { status: 400 },
    );
  }

  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const upstream = await fetch(`${CORE_API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}
