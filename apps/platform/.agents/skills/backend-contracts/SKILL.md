---
name: backend-contracts
description: Mantén el frontend sincronizado con los contratos del backend. Úsala al crear o modificar una llamada a la API, al tocar features/*/api.ts, al mapear una respuesta, o cuando cambies un schema de shared_core.
---

# Contratos con el backend

Un cambio de contrato rompe el frontend en silencio: TypeScript no valida lo
que llega por la red, así que el fallo aparece en producción y no en
`tsc`. Este frontend tiene capas específicas para que eso no ocurra.

## Las capas y su orden

```
Client Component → Server Action → Service → features/*/api.ts
    → lib/server-api.ts (servidor) o lib/http.ts → BFF /api/*
        → API Gateway :7000 → microservicios
```

Reglas inviolables:

1. **Un solo upstream.** El navegador nunca llama a un servicio interno. Va a
   `/api/*` del BFF, y de ahí al gateway. Prohibido `localhost:7001-7004`.
2. **`features/*/api.ts` es el contrato.** Define ahí las rutas y los tipos de
   entrada y salida hacia el gateway.
3. **Normaliza en el adaptador.** Cada servicio tiene su propio shape. Traduce
   al tipo interno en `features/*/api.ts`, nunca en un componente.
4. **Un solo origen de sesión.** La cookie httpOnly `SESSION_COOKIE`
   (`lib/session.ts`) es la credencial real. La leen `proxy.ts`,
   `lib/server-api.ts` y las rutas BFF. `localStorage` solo la refleja para que
   el navegador añada su cabecera `Authorization`. No leas ni escribas la
   cookie por otro nombre.
5. **El proxy no matchea `/api`.** Las rutas BFF deben responder JSON,
   incluido un 401. Si el matcher las captura, devuelve un 307 con HTML donde el
   cliente espera un payload, la hidratación de sesión falla siempre y la entrada
   al sistema se queda en blanco. `config.matcher` existe para excluirlas:
   verificalo antes de tocar el proxy.
6. **`proxy.ts`, no `middleware.ts`.** Next.js 16 deprecó la convención
   `middleware.ts`. El guardián vive en `src/proxy.ts` y exporta una función
   llamada `proxy` (o `default`). Si Next avisa de la deprecación, el arreglo es
   renombrar el archivo y su export, no añadir un `middleware.ts` nuevo.

## Antes de cambiar una llamada

1. **Verifica la fuente del contrato.** El backend expone `/openapi.json` en
   el gateway. Los schemas viven en
   `apps/core/src/shared_core/schemas/`. `docs/sistema/API_ENDPOINTS.md`
   documenta la superficie, pero la fuente es el código.
2. **Usa el grafo, no la suposición.** Para saber quién llama a un endpoint o
   qué consume un schema: `search_graph` y `trace_path` del MCP
   `codebase-memory`. Un contrato tiene consumidores que no vas a recordar.
3. **No inventes un campo.** Si el backend no lo devuelve, no lo pongas en el
   tipo. Si el frontend necesita algo que el backend no expone, el cambio es del
   backend primero.

## Al cambiar un contrato

Cuando cambies un schema en `shared_core`:

1. Actualiza `features/*/api.ts`: ruta, tipo de entrada y tipo de salida.
2. Actualiza el servicio que transforma la respuesta.
3. Actualiza el test del mock. Los tests respetan los schemas: **deben fallar**
   hasta que los actualices. Un test que sigue pasando tras un cambio de
   contrato está mal escrito.
4. Actualiza `docs/sistema/API_ENDPOINTS.md` si cambia la superficie del gateway.
5. Anota el cambio en `docs/sistema/CHANGELOG.md`.

## Errores: no los adornes

El gateway responde con un envelope de error. Extrae el mensaje real para el
usuario, en español, y registra el detalle técnico en la consola. Un
`catch` que devuelve un texto genérico esconde el contrato roto que estás
buscando.

## Verificación

- `bunx tsc --noEmit` detecta desalineaciones de tipos en el adaptador.
- Los tests de `src/test/**` son el contrato ejecutable: si cambian los datos de
  una respuesta, actualiza el mock y confirma que el test falla antes de
  arreglarlo.
- No copies un ejemplo de la documentación como si fuera la realidad. La
  documentación puede ir atrasada; el código no.
