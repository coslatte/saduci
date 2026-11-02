import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "page-configs.json");

import type { PageConfig } from "@/lib/pageConfigTypes";

async function readData(): Promise<PageConfig[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw || "[]") as PageConfig[];
  } catch {
    return [];
  }
}

async function writeData(data: unknown) {
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const items = await readData();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = await readData();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newItem = {
    id,
    createdAt: now,
    updatedAt: now,
    ...(body as Record<string, unknown>),
  } as PageConfig;
  items.push(newItem);
  await writeData(items);

  return NextResponse.json(newItem, { status: 201 });
}
