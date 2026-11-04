# Estrategia de herramientas para agentes

Esta capa es **vendor-neutral**: cualquier agente aprobado (OpenCode, Claude
Code, Codex CLI, Gemini CLI u otro cliente MCP) usa las mismas herramientas para
entender el repositorio. Cambiar de agente no obliga a reconstruir el entorno.

## Modelo mental

```text
HOST         = aplicación que ejecuta al agente (OpenCode, Claude, Codex, Gemini)
CORE TOOLING = herramientas compartidas por todos los hosts
ADAPTER      = archivo mínimo que conecta un host al core tooling
```

El host y el modelo cambian. El core tooling no. La configuración del proyecto
vive en el repositorio, no en la máquina de cada desarrollador.

## Stack base

| Herramienta | Rol | Verificar |
|---|---|---|
| Git | contexto histórico (por qué, cuándo, qué bug) | `git --version` |
| Node.js 24 LTS | runtime de `ast-grep` y del frontend | `node --version` |
| `uv` | runner de Serena | `uv --version` |
| `codebase-memory` | grafo: arquitectura, símbolos, call chains, impacto, ADRs | `codebase-memory-mcp --help` |
| Serena | LSP: símbolos, referencias, edición estructurada | MCP conectado |
| `ast-grep` | búsqueda y reescritura estructural (AST) | `ast-grep --version` |

En Windows se recomienda WSL2 para que el workflow no dependa de diferencias
entre Windows y Unix en procesos, LSP, scripts y binarios nativos.

## Rol de cada herramienta

La división no es negociable. Cada pregunta tiene una herramienta:

| Pregunta | Herramienta | No usar |
|---|---|---|
| ¿Cómo está organizado el proyecto? | `codebase-memory` (`get_architecture`) | `find`/`ls` recursivos |
| ¿Dónde está el símbolo X? | `codebase-memory` (`search_graph`) | `grep -rn` |
| ¿Quién llama a X? ¿Qué llama X? | `codebase-memory` (`trace_path`) | `grep "X("` |
| ¿Qué se rompe si cambio X? | `codebase-memory` (`detect_changes`) | intuición |
| ¿Cuál es la definición real de X? | Serena (LSP) o `get_code_snippet` | leer el archivo entero |
| ¿Dónde se referencia X? | Serena (`find_references`) | `grep` |
| ¿Cómo reescribo este patrón en 40 archivos? | `ast-grep` | `sed`/regex |
| ¿Por qué existe este código? | Git (`log`, `blame`, `show`) | el grafo (no guarda historia) |
| ¿Funciona lo que hice? | tests/lint/typecheck/build del proyecto | una suite paralela |

`codebase-memory` es la memoria y la capa de code intelligence. Serena es la
navegación LSP. `ast-grep` es la modificación sintáctica a escala. Git es el
contexto histórico. Ninguna sustituye a otra.

## MCP como capa estándar

MCP es la interfaz entre el agente y la herramienta. El repositorio piensa en
`Agent → MCP → Tool`, nunca en `Agent → implementación propietaria → Tool`.

Los servidores del proyecto se declaran en `opencode.jsonc` (OpenCode):

```jsonc
{
  "mcp": {
    "codebase-memory-mcp": { "type": "local", "command": ["codebase-memory-mcp"] },
    "serena": {
      "type": "local",
      "command": ["serena", "start-mcp-server",
                  "--context", "ide", "--project-from-cwd"]
    }
  }
}
```

Serena se instala una vez con `uv tool install serena-agent` (o se ejecuta al
vuelo con `uvx --from git+https://github.com/oraios/serena`). El contexto `ide`
evita duplicar las herramientas de archivos y shell que el agente ya tiene.

`ast-grep` no es un servidor MCP: es una CLI que el agente invoca desde el
shell.

### Adaptadores por host

El mismo core tooling se conecta en cada host con su propio mecanismo. Son
adaptadores ligeros, no duplican la estrategia.

**Claude Code** (usuario):

```bash
claude mcp add --scope user serena -- \
  serena start-mcp-server --context claude-code --project-from-cwd
claude mcp add --scope user codebase-memory-mcp -- codebase-memory-mcp
claude mcp list
```

**Codex CLI** (`~/.codex/config.toml`): entradas `[mcp_servers.<nombre>]` con
`command` y `args`. Comprobar con `codex mcp list`.

**Gemini CLI**: `gemini mcp add` o `settings.json`; `GEMINI.md` aporta el
contexto jerárquico. Comprobar con `gemini mcp list`.

**OpenCode**: `opencode.jsonc` del repositorio. Comprobar con `/mcp` o la lista
de herramientas del agente.

## Indexación

Regla única:

```text
SOURCE OF TRUTH          → INDEX
GENERATED / CACHE / BUILD → EXCLUDE
```

Excluir siempre: `.git/`, `node_modules/`, `.next/`, `dist/`, `build/`,
`target/`, `bin/`, `obj/`, `coverage/`, `vendor/`, `artifacts/`, `logs/`,
`cache/`, `generated/`, `.venv/`, `__pycache__/`. En repositorios grandes la
política de indexación y exclusión se configura deliberadamente, no por defecto.

## Seguridad

Prioridad de procesamiento:

```text
1. herramientas locales
2. almacenamiento local
3. embeddings locales cuando sea viable
4. servicios remotos solo si están aprobados
```

No versionar claves de API, tokens, credenciales, `.env`, certificados ni
índices personales. Los servidores MCP reciben solo los permisos necesarios.
No se activan herramientas destructivas para todos los proyectos.

## Política para añadir herramientas

Ninguna herramienta entra solo porque "es de IA". Debe cubrir una capacidad
concreta: `UNDERSTAND`, `SEARCH`, `NAVIGATE`, `TRACE`, `REMEMBER`, `MODIFY`,
`VERIFY` u `OBSERVE`. Antes de añadirla:

```text
¿Ya tenemos esta capacidad?
¿Duplica herramientas existentes?
¿Cuánto contexto consume?
¿Funciona localmente?
¿Es MCP-compatible?
¿Se comparte entre agentes?
¿Introduce datos fuera del entorno corporativo?
```

Cada servidor MCP añade herramientas al contexto del modelo. Demasiados
servidores encarecen cada turno. Menos herramientas, mejor elegidas.

## Orden de adopción

```text
Fase 1  Git · Node 24 · uv · codebase-memory
Fase 2  Serena · ast-grep
Fase 3  Configuración MCP · instrucciones de proyecto · skills compartidas
Fase 4  open-codebase-index (solo si un benchmark muestra mejora real)
Fase 5  herramientas internas: git-context · enterprise-verify · OpenTelemetry
```

`open-codebase-index` es opcional. No se instala simultáneamente con
`codebase-memory` sin una razón concreta: primero se miden calidad de
recuperación, consumo de contexto, latencia, duplicación y mantenimiento.
