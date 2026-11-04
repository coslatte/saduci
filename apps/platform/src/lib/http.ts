import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/apiErrors";
import { notifySessionExpired } from "@/lib/session";

/**
 * Thin wrapper around `fetch` for internal API calls.
 *
 * - Turns connection failures into a friendly Spanish `ApiError`.
 * - Emits a global session-expired event on 401 so the app can redirect to
 *   the login screen with an explanation.
 *
 * Do not use it for `/api/auth/login` or `/api/auth/register`, where a 401
 * means invalid credentials rather than an expired session.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  if (response.status === 401) {
    notifySessionExpired();
  }

  return response;
}
