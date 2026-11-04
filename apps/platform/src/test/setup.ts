import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";
import { afterEach, mock } from "bun:test";

/*
 * The native fetch primitives are captured before registering happy-dom and
 * restored right after: that registrar replaces `Headers`/`Request`/
 * `Response` with stand-ins that do not implement header parsing, so
 * `NextRequest` silently saw an empty cookie jar. Every page guard in
 * `@/proxy` keys off the session cookie, which made those tests fail for a
 * reason unrelated to the code under test. Restoring the originals keeps both
 * the happy-dom DOM and the real fetch stack usable in the same run.
 */
const NATIVE_FETCH = {
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response,
  fetch: globalThis.fetch,
} as const;

GlobalRegistrator.register();
Object.assign(globalThis, NATIVE_FETCH);

// Default mock for `next/navigation` so App Router components (useRouter,
// usePathname, useSearchParams) do not throw during tests. Individual tests
// may override this mock when they need custom navigation behavior.
try {
  if (typeof mock?.module === "function") {
    mock.module("next/navigation", () => ({
      usePathname: () => "/",
      useRouter: () => ({ back: () => {}, push: () => {}, replace: () => {} }),
      useSearchParams: () => new URLSearchParams(),
      redirect: () => {},
    }));
  }
} catch {
  // ignore when not running under the Bun test environment
}

afterEach(() => {
  cleanup();
  GlobalRegistrator.unregister();
  GlobalRegistrator.register();
  // Re-registering the DOM re-installs happy-dom's fetch stand-ins, so the
  // native primitives have to be put back on every reset, not only at boot.
  Object.assign(globalThis, NATIVE_FETCH);
});
