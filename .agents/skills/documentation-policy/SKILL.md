---
name: documentation-policy
description: Project documentation governance for the current phase. Use when creating, editing, or reviewing docs to keep architecture and changelog aligned while broader docs are intentionally deferred.
---

# Documentation Policy (SADECI-Core)

## Purpose

Define how agents should update documentation during the current project stage.

## Current Rule

Only two documentation files are considered active and must be maintained:

- `docs/CHANGELOG.md`
- `docs/ARCHITECTURE.md`

All other docs in `docs/` are intentionally deferred until later iterations.

## Required Behavior for Agents

1. When code behavior changes, update `docs/CHANGELOG.md` with meaningful technical notes.
2. If architecture, endpoints, service boundaries, or data flow change, update `docs/ARCHITECTURE.md` in the same task when feasible.
3. Do not recreate deleted or deferred documentation files unless the user explicitly asks for it.
4. Prefer documenting concrete implemented behavior over aspirational or speculative notes.
5. Keep entries concise but high-information: what changed, where, and why it matters.

## Iterative Documentation Plan

- Iteration 1/3 (current): architecture baseline + detailed changelog tracking.
- Iteration 2/3: operational runbooks and troubleshooting guides.
- Iteration 3/3: full documentation normalization and structure expansion.
