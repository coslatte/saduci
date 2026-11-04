# Guía de retroalimentación al usuario

Cómo comunica la plataforma **carga**, **errores** y **avisos**. La regla de
fondo: ninguna pantalla se queda muda. Siempre hay estructura (esqueleto),
mensaje que avanza con el tiempo, o una salida clara.

## Superficies y cuándo usar cada una

| Superficie | Componente | Cuándo |
|---|---|---|
| Carga de contenido | `Skeleton` + compuestos (`TableSkeleton`, `StatsCardsSkeleton`, `FormSkeleton`, `DetailSkeleton`, `AppShellSkeleton`) | Mientras llega contenido con forma conocida. Nunca un spinner suelto si se puede reservar el layout. |
| Carga de ruta | `loading.tsx` por segmento | Al navegar a una ruta. Next.js lo muestra en streaming antes de hidratar la página. |
| Progreso largo | `RunProgress` | Operaciones de varios segundos (simulación). Barra + transcurrido/estimado + mensaje. |
| Mensaje de carga | `useProgressiveStatus` + `constants/loading.ts` | Para que el texto cambie con el tiempo en lugar de un "Cargando…" fijo. |
| Aviso inline | `Alert` | Mensajes que no bloquean: éxito, advertencia, info en una sección. |
| Error de sección | `ErrorState` | Fallo que necesita explicación y salida: reintentar, copiar referencia, ver detalles. |
| Error de ruta | `error.tsx` (`RouteErrorPage`) | Falla de render de una ruta; aísla la sección y mantiene usable el resto. |
| Vacío | `EmptyState` | No hay datos. Icono + mensaje + acción opcional. |
| Notificación | `Toast` (`showToast`) | Resultado transitorio de una acción. Admite acción ("Reintentar"), pausa al hover y tope de 4. |
| Confirmación | `ConfirmDialog` | Acciones destructivas. Reemplaza a `window.confirm`. |
| Diálogo | `Dialog` | Contenido modal con foco atrapado, `aria-describedby` y footer de acciones. |

## Reglas

1. **Nunca pantalla vacía.** Si algo tarda, se reserva el layout con un
   esqueleto.
2. **El tiempo se comunica.** A partir de ~1 s el mensaje cambia con el
   transcurrido (`useProgressiveStatus`). El texto se anuncia con
   `aria-live="polite"`.
3. **Cada error tiene salida.** `ErrorState` siempre ofrece reintentar o una
   ruta de escape. Los detalles técnicos van plegados y son copiables.
4. **Un error se clasifica.** `classifyError` distingue red, sesión, validación
   y servidor; `ERROR_KIND_COPY` da el texto y la acción por clase.
5. **Nada se comunica solo con color.** Todo estado lleva icono y texto.
6. **Movimiento con respeto.** El shimmer cae a `animate-pulse` bajo
   `prefers-reduced-motion`; la barra de transición deja de animar.

## Dónde vive cada pieza

- Copy de carga: `src/constants/loading.ts`.
- Hook de progreso: `src/hooks/useProgressiveStatus.ts`.
- Clasificación de errores: `src/lib/apiErrors.ts`.
- Componentes: `src/components/atoms/` y `src/components/molecules/`.
- Esqueletos de ruta: `loading.tsx` en cada segmento de `src/app/`.
- Boundaries: `error.tsx` por segmento, `src/app/global-error.tsx` para el layout raíz.
