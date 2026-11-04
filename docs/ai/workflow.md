# Flujo de trabajo de agentes

## Regla de oro

Ningún agente salta de `REQUEST` a `EDIT`. Primero entiende, luego cambia.

```text
REQUEST
   ▼
UNDERSTAND ── codebase-memory (get_architecture)
   ▼
SEARCH ────── codebase-memory (search_graph)
   ▼
NAVIGATE ──── Serena (LSP) / get_code_snippet
   ▼
TRACE ─────── referencias, callers, callees, dependencias
   ▼
HISTORY ───── Git (log, blame, show)
   ▼
IMPACT ────── detect_changes / trace_path
   ▼
IMPLEMENT ─── edición directa o ast-grep si es estructural
   ▼
VERIFY ────── formatter, lint, typecheck, tests, build
   ▼
DOCUMENT / REMEMBER ── codebase-memory + docs/sistema/CHANGELOG.md
```

## Enrutamiento

| Paso | Herramienta | Salida esperada |
|---|---|---|
| Entender | `get_architecture`, `search_graph` | módulos, entry points, símbolos |
| Buscar | `search_graph`, `query_graph` | candidatos con `file:line` |
| Navegar | Serena, `get_code_snippet` | definición real, no un fragmento |
| Trazar | `trace_path`, `find_references` | callers, callees, dependencias |
| Historia | `git log`, `git blame`, `git show` | por qué existe el código |
| Impacto | `detect_changes`, `trace_path` | archivos y símbolos afectados |
| Implementar | `Edit` / `ast-grep` | cambio acotado |
| Verificar | comandos del proyecto | lint/tests/typecheck en verde |
| Recordar | `docs/sistema/CHANGELOG.md` | cambio anotado |

## Evidencia

Toda afirmación sobre el código se sostiene con evidencia, no con memoria del
modelo.

- **Niveles.** *Scout*: consulta rápida, positiva, provisional. *Verify*
  (por defecto): grafo dirigido a la tarea, snippets exactos, paginación.
  *Auditor*: verificación acotada completa, ambas direcciones de llamadas,
  cobertura declarada.
- **Cobertura.** Antes de una afirmación negativa o exhaustiva ("nadie llama a
  esto", "es la única implementación"), llama a `check_index_coverage` sobre
  cada ruta citada. Un resultado limpio no prueba completitud.
- **Huecos.** Si una ruta aparece como no indexada, el grafo no es confiable
  ahí: lee el rango señalado y decide con el código.
- **Cita.** Toda ubicación se da como `ruta:línea`.

## Verificación reproducible

La autoridad son los comandos reales del repositorio, no una suite paralela.
Ningún cambio se declara terminado sin ejecutarlos.

| Alcance | Comando |
|---|---|
| Backend · tests | `python scripts/saduci.py test` (o `make test`) |
| Backend · lint | `uv run ruff check .` (desde `apps/core`) |
| Frontend · tests | `cd apps/platform && bun test --preload ./src/test/setup.ts` |
| Frontend · tipos | `cd apps/platform && bunx tsc --noEmit` |
| Frontend · lint | `cd apps/platform && bun run lint` |
| Estado del sistema | `python scripts/saduci.py check` |
| Coherencia del deploy | `python scripts/saduci.py deploy-check` |

El build de producción (`bun run build`) se ejecuta **solo si el usuario lo
pide**.

## Prueba funcional obligatoria

Con el agente dentro del repositorio, esta prueba valida que use el workflow y
no búsquedas textuales indiscriminadas:

```text
Analiza cómo se procesa una petición desde su entrada hasta el punto
donde se persisten los datos. No modifiques ningún archivo.

Antes de responder:
1. identifica el módulo de entrada;
2. encuentra los símbolos relevantes;
3. localiza las implementaciones;
4. revisa referencias y dependencias;
5. revisa el contexto arquitectónico disponible;
6. inspecciona el historial Git cuando haga falta;
7. explica el flujo completo;
8. entrega las ubicaciones (ruta:línea) de archivos y símbolos.
```

## Git como contexto

Git no es solo control de versiones: es una fuente de contexto. Antes de
cambiar código, `git log`, `git show` y `git blame` responden por qué existe una
implementación, cuándo entró, qué bug resolvía, qué archivos cambian juntos y
qué comportamiento se revirtió. El grafo no lleva historial: para esto, el
shell es la herramienta correcta.
