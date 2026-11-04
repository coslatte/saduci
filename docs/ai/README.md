# Metodología de agentes

Capa vendor-neutral para cualquier agente aprobado (OpenCode, Claude Code, Codex
CLI, Gemini CLI u otro cliente MCP). El agente y el modelo son intercambiables;
la capa de conocimiento y herramientas pertenece al repositorio.

## Documentos

| Documento | Contenido |
|---|---|
| [`tooling.md`](tooling.md) | Stack de herramientas, rol de cada una, MCP, adaptadores por host, indexación, seguridad, política de adopción |
| [`workflow.md`](workflow.md) | Flujo de investigación, enrutamiento por pregunta, evidencia, verificación |

## Cómo se carga en cada host

El contenido es el mismo; solo cambia el mecanismo nativo del host.

```text
AGENTS.md   → OpenCode, Codex
CLAUDE.md   → Claude Code (apunta a AGENTS.md)
GEMINI.md   → Gemini CLI (apunta a AGENTS.md)
```

Las skills compartidas viven en `.agents/skills/` (raíz) y en
`apps/*/.agents/skills/` (por aplicación). Describen **cómo trabajar**; no
duplican lo que ya se consulta con las herramientas.

## Fuera de este directorio

La arquitectura, la API y el despliegue del sistema **no** se documentan aquí:
viven en `docs/sistema/`. Los contratos del backend son el código en
`apps/core/src/`, no la documentación.
