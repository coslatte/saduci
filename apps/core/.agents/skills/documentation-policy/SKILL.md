---
name: documentation-policy
description: Project documentation governance for the current phase. Use when creating, editing, or reviewing docs to keep architecture and changelog aligned while broader docs are intentionally deferred.
---

# Documentation Policy (SADUCI-Core)

## Purpose

Define how agents should update documentation during the current project stage.

## Current Rule

Documentation is canonical at the monorepo root, under `docs/sistema/`. These
files are active and must be maintained:

- `docs/sistema/CHANGELOG.md` — technical progress and meaningful changes.
- `docs/sistema/ARCHITECTURE.md` — architecture aligned with real code behavior.
- `docs/sistema/API_ENDPOINTS.md` — gateway surface and contracts.
- `docs/sistema/RUNNING.md` — local execution, tests, troubleshooting.
- `docs/sistema/DEPLOY.md` — server deployment, operation, backups.
- `docs/sistema/history/` — per-app historical changelogs.
- `docs/tesis/` — thesis chapters and diagrams.

Do not create app-local `docs/` folders under `apps/core`, and do not recreate
deleted documentation files unless the user explicitly asks for it. Do not add
a third document for a topic that `RUNNING.md` or `DEPLOY.md` already covers.

## Required Behavior for Agents

1. When code behavior changes, update `docs/sistema/CHANGELOG.md` with meaningful technical notes.
2. If architecture, endpoints, service boundaries, or data flow change, update `docs/sistema/ARCHITECTURE.md` in the same task when feasible.
3. Update `docs/sistema/API_ENDPOINTS.md` when the gateway surface changes.
4. Prefer documenting concrete implemented behavior over aspirational or speculative notes.
5. Keep entries concise but high-information: what changed, where, and why it matters.
