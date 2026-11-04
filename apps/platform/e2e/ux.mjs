/**
 * Regression guard for the interaction layer.
 *
 * This suite exists because the app was, for a long time, shipping a UI where
 * almost nothing responded: a stray popover backdrop swallowed every click in
 * the application, and the admin page bounced back to the dashboard. Neither
 * was caught by unit tests, so the checks below drive a real browser and
 * assert the behaviour a user actually depends on:
 *
 *   - every sidebar entry navigates,
 *   - no invisible full-screen overlay intercepts pointer events,
 *   - the profile popover opens, navigates and closes,
 *   - interactive labels are not text-selectable while content still is,
 *   - no page renders a control that something else covers.
 *
 * Run with `bun run test:e2e` while the dev stack is up (`bun run dev`, plus
 * the backend). Point CHROME_PATH at another binary if needed.
 */
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:4000";
const EXEC =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CREDENTIALS = {
  username: process.env.E2E_USERNAME ?? "admin",
  password: process.env.E2E_PASSWORD ?? "admin",
};

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "OK   " : "FALLO";
  console.log(`${mark} | ${name}${detail ? ` | ${detail}` : ""}`);
}

/** The gateway rate-limits /auth/login, so retries must be spaced out. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
let loginTimestamps = [];

async function paceLogin() {
  const now = Date.now();
  loginTimestamps = loginTimestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (loginTimestamps.length >= RATE_LIMIT_MAX - 1) {
    const wait = RATE_LIMIT_WINDOW_MS - (now - loginTimestamps[0]) + 1_000;
    console.log(`   (esperando ${Math.round(wait / 1000)}s por el rate limit)`);
    await new Promise((r) => setTimeout(r, wait));
  }
  loginTimestamps.push(Date.now());
}

const browser = await chromium.launch({
  executablePath: EXEC,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

/** Resets the client-side expansion state so each case starts from the same UI. */
async function openHome({ clearSidebarState = true } = {}) {
  await page.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  if (clearSidebarState) {
    await page.evaluate(() =>
      localStorage.removeItem("saduci:sidebar-expanded"),
    );
    await page.waitForTimeout(400);
  }
}

try {
  // ---------- login ----------
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#login-identifier", { timeout: 30_000 });
  await page.fill("#login-identifier", CREDENTIALS.username);
  await page.fill("#login-password", CREDENTIALS.password);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await paceLogin();
    const response = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login"),
      { timeout: 6_000 },
    );
    await page.click('button[type="submit"]');
    try {
      if ((await response).status() === 200) break;
    } catch {
      // React may not have attached the handler yet; click again.
      await page.waitForTimeout(900);
    }
  }
  await page.waitForURL("**/home", { timeout: 25_000 });
  await page.waitForTimeout(1800);
  check("login llega al dashboard", new URL(page.url()).pathname === "/home");

  const mapped = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("saduci_user") || "null"),
  );
  check(
    "el usuario guarda el rol y el permiso normalizados",
    mapped?.isSuperuser === true && mapped?.role === "Administrador",
    JSON.stringify(mapped),
  );

  // ---------- sidebar navigation ----------
  // `/records` redirects to `/records/simulations` by design.
  const sidebarTargets = [
    ["Simulación", "/simulation"],
    ["Registros", "/records/simulations"],
    ["Predicción", "/prediction"],
    ["Panel de administración", "/admin/users"],
    ["Dashboard", "/home"],
  ];
  for (const [label, expected] of sidebarTargets) {
    await openHome();
    await page
      .locator("aside a", { hasText: new RegExp(`^${label}$`) })
      .first()
      .click({ timeout: 8_000, noWaitAfter: true })
      .catch(() => {});
    await page.waitForTimeout(2200);
    const got = new URL(page.url()).pathname;
    check(`sidebar "${label}" navega`, got === expected, got);
  }

  // ---------- nested submenu ----------
  await openHome();
  await page
    .locator('aside button[aria-label*="Desplegar Registros"]')
    .first()
    .click({ timeout: 8_000 })
    .catch(() => {});
  await page.waitForTimeout(700);
  const child = page
    .locator("aside a", { hasText: /^Registro predicciones$/ })
    .first();
  const childVisible = await child.isVisible().catch(() => false);
  await child.click({ timeout: 8_000, noWaitAfter: true }).catch(() => {});
  await page.waitForTimeout(2200);
  check(
    "el submenu expandido navega",
    childVisible && new URL(page.url()).pathname === "/records/predictions",
    new URL(page.url()).pathname,
  );

  // ---------- no invisible full-screen overlay ----------
  const overlays = await page.evaluate(() => {
    const found = new Set();
    for (let x = 100; x < window.innerWidth; x += 200) {
      for (let y = 100; y < window.innerHeight; y += 150) {
        const top = document.elementFromPoint(x, y);
        if (!top) continue;
        const cs = getComputedStyle(top);
        if (
          cs.position === "fixed" &&
          cs.pointerEvents !== "none" &&
          top.getBoundingClientRect().width >= window.innerWidth * 0.9
        ) {
          found.add(
            `${top.tagName.toLowerCase()}.${String(top.className).slice(0, 40)}`,
          );
        }
      }
    }
    return [...found];
  });
  check(
    "ningún overlay a pantalla completa intercepta el puntero",
    overlays.length === 0,
    overlays.join(", ") || "ninguno",
  );

  // ---------- the sidebar must not repeat any page ----------
  await openHome();
  await page.evaluate(() => {
    localStorage.setItem(
      "saduci:sidebar-expanded",
      JSON.stringify(["/records-Registros"]),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2400);
  const sidebarEntries = await page.evaluate(() => {
    const asides = [...document.querySelectorAll("aside")].filter((a) => {
      const cs = getComputedStyle(a);
      return cs.display !== "none" && a.getClientRects().length > 0;
    });
    return asides.flatMap((aside) =>
      [...aside.querySelectorAll("nav li")]
        .map((li) => {
          const a = li.querySelector("a");
          if (!a) return null;
          const holder = a.closest("div[aria-hidden]");
          if (holder && getComputedStyle(holder).pointerEvents === "none") {
            return null; // collapsed submenu
          }
          return { label: a.textContent.trim(), href: a.getAttribute("href") };
        })
        .filter(Boolean),
    );
  });
  const repeated = [
    ...new Set(
      sidebarEntries
        .map((e) => e.href)
        .filter((href, i, all) => all.indexOf(href) !== i),
    ),
  ];
  check(
    "el sidebar no repite ninguna pagina",
    repeated.length === 0,
    repeated.length
      ? `repetidas: ${repeated.join(", ")}`
      : `${sidebarEntries.length} entradas, sin repetidas`,
  );

  const rootLabels = sidebarEntries
    .filter((e) => !e.label.startsWith("Registro "))
    .map((e) => e.label);
  check(
    "el sidebar mantiene el orden de lectura",
    JSON.stringify(rootLabels) ===
      JSON.stringify([
        "Dashboard",
        "Simulación",
        "Pruebas estadísticas",
        "Predicción",
        "Registros",
        "Administración",
      ]),
    rootLabels.join(" > "),
  );

  // ---------- diagnosis pickers show the clinical title only ----------
  await page.goto(`${BASE}/prediction`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#pred-edad", { timeout: 30_000 });
  await page.waitForTimeout(2000);
  await page.getByRole("combobox").nth(0).click({ timeout: 8000 });
  await page.waitForTimeout(700);
  const diagnosisOptions = await page.evaluate(() =>
    [...document.querySelectorAll('[role="option"]')].map((o) =>
      o.textContent.trim(),
    ),
  );
  check(
    "el listado de diagnosticos no muestra codigos",
    diagnosisOptions.length > 0 &&
      diagnosisOptions.every((o) => !/^\d/.test(o)),
    diagnosisOptions.length
      ? `${diagnosisOptions.length} opciones, primera="${diagnosisOptions[0]}"`
      : "no se pudo abrir el listado",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // ---------- a prediction actually runs and lands in the result column ----------
  {
    const predictionResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/prediction") && r.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: /Predecir/ }).click();
    const status = (await predictionResponse).status();
    check(
      "la prediccion se ejecuta desde la interfaz",
      status === 200,
      `HTTP ${status}`,
    );
    await page.waitForTimeout(1500);

    const result = await page
      .locator('section[aria-labelledby="prediction-result-title"]')
      .innerText()
      .catch(() => "");
    check(
      "el resultado del modelo se muestra",
      /\d+(\.\d+)?%/.test(result),
      result.replace(/\n/g, " | ").slice(0, 60),
    );
  }

  // ---------- page frame: bounded width and a result column ----------
  const measureColumns = () =>
    page.evaluate(() => {
      const frame = document.querySelector("main div.mx-auto");
      if (!frame) return { error: "no se encontro el marco de pagina" };
      const header = frame.firstElementChild;
      const columns = header?.nextElementSibling;
      if (!columns)
        return { error: "no se encontro el contenedor de columnas" };
      const hijos = [...columns.children];
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      };
      return {
        count: hijos.length,
        main: box(hijos[0]),
        aside: hijos[1] ? box(hijos[1]) : null,
        width: Math.round(frame.getBoundingClientRect().width),
      };
    });

  {
    const m = await measureColumns();
    check(
      "prediccion: resultado en columna aparte en escritorio",
      !m.error && m.count === 2 && m.aside.x >= m.main.x + m.main.w - 4,
      m.error ??
        `main x=${m.main.x} w=${m.main.w} | aside x=${m.aside.x} w=${m.aside.w}`,
    );
    check(
      "prediccion: ancho acotado",
      !m.error && m.width <= 1280,
      `${m.width}px`,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1200);
    const movil = await measureColumns();
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    check(
      "movil: el resultado se apila bajo el formulario",
      !movil.error &&
        movil.aside &&
        movil.aside.y >= movil.main.y + movil.main.h - 4,
      movil.error ??
        `main y=${movil.main.y} h=${movil.main.h} | aside y=${movil.aside?.y}`,
    );
    check(
      "movil: sin desbordamiento horizontal",
      overflow.scrollW <= overflow.clientW + 1,
      JSON.stringify(overflow),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(800);
  }

  {
    await page.goto(`${BASE}/simulation`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2400);
    const m = await measureColumns();
    check(
      "simulacion: una columna mientras no hay resultados",
      !m.error && m.count === 1,
      m.error ?? `columnas=${m.count}`,
    );
    check(
      "simulacion: ancho acotado",
      !m.error && m.width <= 1280,
      `${m.width}px`,
    );
  }

  // ---------- profile popover ----------
  await openHome();
  await page.getByLabel("Ir a perfil de usuario").click({ timeout: 8_000 });
  await page.waitForTimeout(700);
  check(
    "el popover de perfil se abre",
    await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false),
  );
  await page
    .getByRole("link", { name: "Configurar" })
    .click({ timeout: 8_000, noWaitAfter: true })
    .catch(() => {});
  await page.waitForTimeout(2200);
  check(
    "el popover navega a los ajustes",
    new URL(page.url()).pathname === "/settings",
    new URL(page.url()).pathname,
  );

  await openHome();
  await page.getByLabel("Ir a perfil de usuario").click({ timeout: 8_000 });
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  check(
    "Escape cierra el popover",
    (await page.locator('[role="dialog"]').count()) === 0,
  );

  // ---------- text selection ----------
  await openHome({ clearSidebarState: false });
  const selection = await page.evaluate(() => {
    const pick = (selector, text) => {
      const all = [...document.querySelectorAll(selector)];
      return text
        ? all.find((el) => (el.textContent || "").trim().includes(text))
        : all[0];
    };
    const nav = pick("aside a", "Simulación");
    const header = pick("header a", "Saduci");
    const rawButton = pick("main button");
    const main = document.querySelector("main");
    return {
      nav: nav && getComputedStyle(nav).userSelect,
      header: header && getComputedStyle(header).userSelect,
      rawButton: rawButton && getComputedStyle(rawButton).userSelect,
      main: main && getComputedStyle(main).userSelect,
    };
  });
  check(
    "las etiquetas de los controles no son seleccionables",
    selection.nav === "none" &&
      selection.header === "none" &&
      selection.rawButton === "none",
    JSON.stringify(selection),
  );
  check(
    "el contenido de la página sí es seleccionable",
    selection.main === "text",
    String(selection.main),
  );

  // ---------- no covered controls on any page ----------
  const pages = [
    "/statistics",
    "/records/predictions",
    "/records/simulations",
    "/settings",
    "/admin/users",
    "/prediction",
    "/simulation",
  ];
  for (const path of pages) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2400);
    const info = await page.evaluate(() => {
      const isReachable = (el) => {
        const cs = getComputedStyle(el);
        if (cs.pointerEvents === "none" || cs.visibility === "hidden")
          return false;
        if (Number(cs.opacity) === 0) return false;
        // `sr-only` inputs are 1x1 proxies driven by their visible <label>.
        if (el.classList.contains("sr-only")) return false;
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      };
      const all = [
        ...document.querySelectorAll("main button, main a, main input"),
      ].filter(isReachable);
      const blocked = all.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return false;
        if (r.right < 0 || r.left > window.innerWidth) return false;
        const top = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        return top && top !== el && !el.contains(top);
      });
      return { total: all.length, blocked: blocked.length };
    });
    check(
      `${path} no deja controles cubiertos`,
      info.blocked === 0,
      `visibles=${info.total} cubiertos=${info.blocked}`,
    );
  }
} finally {
  console.log(
    `\nerrores de pagina: ${pageErrors.length ? pageErrors.join(" | ") : "ninguno"}`,
  );
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} OK ===`);
for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
