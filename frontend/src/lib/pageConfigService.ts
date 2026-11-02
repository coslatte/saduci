import type { PageConfig } from "./pageConfigTypes";

const BASE = "/api/page-configs";

export async function getPages(): Promise<PageConfig[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch pages");
  return res.json();
}

export async function getPage(id: string): Promise<PageConfig> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch page");
  return res.json();
}

export async function createPage(
  payload: Partial<PageConfig>,
): Promise<PageConfig> {
  const res = await fetch(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create page");
  return res.json();
}

export async function updatePage(
  id: string,
  payload: Partial<PageConfig>,
): Promise<PageConfig> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update page: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deletePage(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete page");
}

const pageConfigService = {
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
};

export default pageConfigService;
