# Changelog

All notable changes to this project are documented in this file.

## 2026-04-05

### Added — 2026-04-05

- Added mobile-navigation labels to shared constants: `NAVBAR_OPEN_NAVIGATION` and `APP_SHELL_CLOSE_NAVIGATION`.
- Added login field constants for centralized visible text usage in auth form: `LOGIN_EMAIL_LABEL`, `LOGIN_EMAIL_PLACEHOLDER`, `LOGIN_PASSWORD_LABEL`, `LOGIN_PASSWORD_PLACEHOLDER`.
- Added responsive behavior coverage for shell/navbar through tests in:
  - `src/test/components/layout/AppShell.test.tsx`
  - `src/test/components/organisms/Navbar.test.tsx`

### Changed — 2026-04-05

- Implemented mobile-first responsive shell behavior:
  - `src/components/layout/AppShell.tsx` now includes a mobile drawer sidebar, overlay close behavior, and `Escape` handling.
  - `src/components/organisms/Navbar.tsx` now exposes a mobile navigation trigger.
  - `src/components/molecules/NavBreadcrumb.tsx` now truncates/hides segments on small screens.
  - `src/components/organisms/Footer.tsx` now uses compact responsive spacing.
- Updated global content spacing for small screens in `src/components/layout/Container.tsx`.
- Adapted route-level responsive layout in remaining key screens/components:
  - `src/app/login/components/LoginForm.tsx`
  - `src/app/settings/page.tsx`
  - `src/app/statistics/components/StatisticsTabs.tsx`
  - `src/app/simulation/components/SimulationResultsSection.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/admin/create/page.tsx`
  - `src/app/admin/builder/[pageId]/page.tsx`
  - `src/app/admin/builder/[pageId]/components/{PageCanvas,BlockPropsEditor,TagListEditor}.tsx`
- Simplified sidebar collapse animation suppression logic in `src/components/organisms/Sidebar.tsx` to avoid React hook lint violations while preserving behavior.
- Restored API test compatibility by adding exported handler contracts and fallback chains in:
  - `src/app/api/prediction/route.ts` (`handlePredictionRequest`)
  - `src/app/api/prediction/explain/route.ts` (`handlePredictionExplainRequest`)

### Validation — 2026-04-05

- Lint: `bun run lint` completed with **0 errors** (non-blocking warnings remain in untouched files).
- Focused tests (responsive-related files): **34 pass / 0 fail**.
- Full suite: `bun run test` passed with **324 pass / 0 fail**.
- React Doctor executed (`bunx -y react-doctor@latest . --verbose --diff`); scan completed with no reported issues in changed React files, but score omitted due local lint-plugin parsing incompatibility in doctor's lint stage.

## 2026-03-16

### Added — 2026-03-16

- Added `docs/CHANGELOG.md` to track notable project updates and validation results.
- Added `data-slot="navbar-user-online-indicator"` in `src/components/organisms/Navbar.tsx` to align with navbar UI/test contract.

### Changed — 2026-03-16

- Standardized prediction route/domain naming from legacy `prediccion` to `prediction` across app pages, API routes, constants, navigation, and tests.
- Updated navigation active-state resolution in `src/lib/navigation.ts` so ancestor items can be marked active when a child route is active.
- Updated navbar profile role rendering to uppercase for consistent UI contract (`SYSTEM ADMIN` style).
- Refactored sidebar manual-expansion state initialization in `src/components/organisms/sidebar/SidebarSection.tsx` using a dedicated initializer helper, improving compatibility with React Compiler diagnostics.
- Removed duplicated block from `src/test/app/prediction/PredictionForm.test.tsx` that caused redeclaration conflicts.
- Applied lint/prettier formatting fixes in `src/app/prediction/page.tsx`.

### Validation — 2026-03-16

- Lint: `bun run lint` completed without reported errors.
- Tests: `bun run test` passed with **265 pass / 0 fail**.
- Additional diagnostic context: React Doctor previously reported **99/100** with one non-blocking warning in `src/components/organisms/Sidebar.tsx` about state derived from prop.
