"use server";

import { fetchSession } from "@/features/auth/api";

export async function getSession() {
  return fetchSession();
}
