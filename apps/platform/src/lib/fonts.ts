type FontToken = {
  className: string;
  variable: string;
};

// Centralized font exports so components and layout can import the same
// font instances and expose font variables consistently across the app.
// This file is defensive: in test environments `next/font/google` may behave
// differently, so we fallback to no-op className/variable values.
let primaryFont: FontToken = { className: "", variable: "" };
let secondaryFont: FontToken = { className: "", variable: "" };
try {
  // Try to require the next font module. Using require keeps this safe for
  // environments where ESM static import may throw or behave differently.

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nf = require("next/font/google");
  const Inter = nf?.Inter ?? nf?.default?.Inter ?? nf?.default ?? nf;
  const Manrope = nf?.Manrope ?? nf?.default?.Manrope;
  if (typeof Inter === "function") {
    primaryFont = Inter({
      subsets: ["latin"],
      display: "swap",
      variable: "--font-family-primary",
    });
  }
  if (typeof Manrope === "function") {
    secondaryFont = Manrope({
      subsets: ["latin"],
      display: "swap",
      variable: "--font-family-secondary",
    });
  }
} catch {
  // ignore: tests or non-next runtimes may not provide the same API
}

export { primaryFont, secondaryFont };
export const inter = primaryFont;
export default primaryFont;
