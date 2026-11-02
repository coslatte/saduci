# Arquitectura para `saduci-platform`

- Stack principal: Next.js (App Router) + React 19 + TypeScript + Tailwind v4, ejecutado con Bun.
- Estructura de UI: `src/components/atoms`, `molecules`, `organisms`, `layout`.
- Reutiliza utilidades comunes antes de crear nuevos patrones:
  - `cn()` en `src/lib/utils.ts`
  - Tipos en `src/lib/types.ts`
- Mantén los imports con el alias `@/` cuando sea posible.

## Arquitectura del repo

Sumamente importante para mantener consistencia y escalabilidad a largo plazo. La estructura actual es:

- `src` root.
- `app` para páginas y rutas (App Router).
- `components` para la UI, organizado por atomic design.
- `lib` para utilidades y tipos compartidos.
- `test` para pruebas, organizado por dominio (`atoms`, `molecules`, `layout`).
- `public` para assets estáticos.
- `styles` para estilos globales (configuración de Tailwind, resets, etc.).
- `hooks` para custom hooks reutilizables.
- `context` para providers y contextos globales.

## Arquitectura y patrones del repo

- Páginas en `src/app/**` (App Router). Usa `"use client"` solo cuando haya estado/efectos/APIs de navegador.
- Sigue composición por capas: atom -> molecule -> organism -> page.

## Nomenclatura de archivos de páginas

- Notas rápidas:
  - Los entry points de rutas en Next.js App Router deben seguir llamándose `page.tsx` (Next lo requiere) y deben localizarse en `src/app/<ruta>/page.tsx`.
  - Para evitar una masa de archivos genéricos con el mismo nombre, NUNCA usar `page.tsx` o `index.tsx` como nombre para componentes reutilizables o páginas que no sean entry points de ruta.
  - Para componentes de tipo "página" que NO son entry points (por ejemplo: páginas reutilizables, vistas para pruebas, helpers de UI), use nombres descriptivos en PascalCase y, si procede, añada el sufijo `Page`: `DashboardPage.tsx`, `SimulacionPage.tsx`.
  - Evite `index.tsx` dentro de carpetas de componentes; prefiera `ComponentName.tsx` para facilitar búsquedas y evitar ambigüedad.
  - Mantenga las rutas descriptivas: nombre claro de la carpeta + un único `page.tsx` por ruta. Ej: `src/app/dashboard/page.tsx` en vez de múltiples `page.tsx` repartidos sin estructura.
  - En `src/test/` o entornos de ejemplo, también usar nombres explícitos: `TestingBoardPage.tsx`, `SimulacionTestPage.tsx`.
- Para variantes y tamaños, sigue el patrón de mapas de clases (ejemplo: `src/components/atoms/Buttons/constants.ts`).
- Mantén accesibilidad observable en componentes (`role`, `aria-*`, labels).

## Contexto teórico del proyecto

Aplicación con propósito de hosteo en servidor con propósito de soporte para personal de la salud. Se piensa aplicación sea de uso para personal de la salud, científicos de la misma área y no pacientes naturales.

## Evitar modificar

Salvo que sea realmente necesario, evitar modificar:

- `yarn.lock`, `package.json`, `bun.lock`, `eslint.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, y otros archivos de configuración salvo que sea estrictamente necesario para agregar dependencias o scripts. Siempre se revisará qué dependencias se estarán agregando, y si estas son actualizadas o están en su última versión.
- Modificar archivos de dependencias

## Política de estilos (TailwindCSS / CSS)

- Usa Tailwind para estilos, evitando CSS personalizado salvo que sea necesario para casos muy específicos.
- Usa de referencia la última versión de Tailwind (v4) y sus nuevas utilidades (en caso de ser necesario buscar en la web para utilidades en particular, realizarlo).
  - Gestión de clases Tailwind: Ya no extraeremos por norma las clases de Tailwind a constantes/variables cuando se creen componentes nuevos. En su lugar, use clases inline en el JSX para la mayoría de los casos y utilice `cn()` para componer clases dinámicas o condicionales cuando sea necesario. Evite la proliferación de pequeñas constantes de estilo que solo se usan una vez; prefiera la legibilidad local y la claridad del marcado. Si hay patrones de estilo realmente reutilizables y estables, considérelos para centralizarlos en un archivo de estilos compartido con un nombre claro.
- Evitar lo máximo posible el uso de `!important` o hacks de CSS. Si es necesario, documenta claramente el motivo en la PR/commit.
- Evitar lo máximo posible el uso de widths/heights fijos en estilos. Prioriza clases de Tailwind que permitan flexibilidad y adaptabilidad (ej. `w-full`, `max-w-md`, `h-auto`) para mejorar la responsividad y evitar problemas de diseño en diferentes tamaños de pantalla.

## Política de instrucciones de usuario

Cuando el usuario solicite instrucciones básicas genéricas como:

- Procede
- Hazlo
- Continúa
- Haz lo que tú creas / consideres
- Revisa

Si no le anteceden tareas a realizar o un plan anterior, se quiere que se corran los tests a partir de las políticas de testing.

## Política de testing

- Todo componente nuevo o modificado debe incluir/actualizar tests en `src/test/components/**`.
- Mantén los tests alineados por dominio (`atoms`, `layout`, `molecules`, `organisms`) dentro de ese directorio central.
- No modifiques tests existentes salvo que sea intrínsecamente necesario por inconsistencia real con el contrato actual del componente.
- Si debes editar un test existente, documenta brevemente el motivo en la PR/commit.
- Prioriza tests deterministas de comportamiento/DOM/clases (evita snapshots frágiles como única cobertura).

### Niveles de responsabilidad en tests

- **Atómico (componentes UI):** Cada componente es una "caja pura". Prueba que props produzcan los cambios visuales esperados y que callbacks se disparen exactamente una vez. A partir de ~40 componentes base se esperan 150+ tests en este nivel.
- **Lógica (hooks y business logic):** Prueba hooks aislados de la vista. Cubre: cálculos, manejo de `null`/`undefined`, y formateo. Cada hook complejo debe tener casos de éxito, carga, error, datos vacíos y datos extremos.
- **Integración (flujos de usuario):** Verifica que los componentes interactúen correctamente entre sí. Prueba flujos críticos completos (ej: validación de entrada -> actualización de resultados).

### Criterios adicionales para contexto médico

- **Contract mocks:** Los mocks deben respetar los schemas del backend. Si cambia el contrato del backend, el test del frontend debe fallar al actualizar el mock.
- **Edge cases con semántica clínica:** Prueba valores extremos con lógica de dominio: ¿un valor `0` en un signo vital es error de sensor o evento crítico? Esa lógica de decisión debe estar testeada explícitamente.
- Los tests son documentación técnica ejecutable: cada test es un contrato que describe cómo funciona el sistema y no puede romperse.

## Política de uso de componentes

Deben usarse componentes ya existentes siempre que cumplan el propósito, incluso si no son 100% perfectos para el caso. Evita crear nuevos componentes a menos que sea estrictamente necesario para evitar proliferación de componentes similares. Si un componente existente no es adecuado, considera extenderlo o modificarlo antes de crear uno nuevo desde cero.

## Políticas con los MCP

- Evita usar MCPs a menos que sea necesario para casos muy específicos.
- Si se usan, documenta claramente el motivo y la lógica detrás de su uso en la PR/commit.

## Verificación antes de cerrar cambios

Ejecutar siempre que se concluya una tarea o cambio importante los siguientes comandos para verificar que no se rompa nada:

```bash
bun run lint ; bun run test
```

Muy especialmente, con ánimo de resolver un problema en que involucre esta función, correr:

```bash
bun run build
```

No des por finalizado un trabajo si esos comandos no pasan.

## Comentarios en código

Evitar comentarios que sobreexpliquen el código. Siempre que se pueda, evitarlos. Evitar código que utilice emojis u caracteres especiales.

## Pautas específicas aplicadas en estos cambios (y para el futuro)

- Extraer componentes repetidos de páginas: cuando una `page.tsx` contiene bloques UI muy repetidos (formularios con muchos inputs, tarjetas, grids), extrae esos bloques a un componente dentro de la ruta: `src/app/<ruta>/components/ComponentName.tsx`. Esto mantiene las páginas ligeras y facilita pruebas unitarias.

- Centralizar literales visibles y mensajes: todas las cadenas UI (títulos, subtítulos, etiquetas, placeholders, mensajes de error, labels de botones, textos de navegación) deben colocarse en `src/constants/constants.ts` (o submódulos dentro de `src/constants/`) en vez de estar hardcodeadas en los componentes. Esto facilita cambios futuros y prepara la base para i18n.

  Obligatorio — constantes para textos visibles: a partir de ahora es obligatorio crear y usar constantes para TODOS los textos visibles en la UI (títulos, subtítulos, descripciones, labels, placeholders, textos de ayuda, mensajes de error, botones, navegación, etc.).
  - Implementación inmediata: cuando añadas o modifiques componentes o páginas, crea y exporta las constantes correspondientes en `src/constants/constants.ts` o en un submódulo dentro de `src/constants/` (por dominio). Reemplaza los literales en JSX/TSX por estas constantes y usa los imports con el alias `@/`.
  - Organización: agrupa las constantes por dominio (ej. `login`, `navigation`, `simulation`, `validation`) y exporta funciones helper para textos dinámicos si es necesario (por ejemplo `runsRangeText(min, max)`).

  Esta regla busca garantizar consistencia, facilitar traducción y evitar literales dispersos en el código base. Si existe una razón válida para no extraer un literal (excepciones muy puntuales), documenta la excepción en el commit/PR.

- Organización de `constants`: agrupa por dominio (login, navigation, simulation, validation, etc.). Para valores dinámicos o formateos de texto, provee funciones helper en el mismo archivo (p. ej. `runsRangeText(min, max)`).

- SVGs e íconos: reemplaza SVGs inline por iconos desde `react-icons` (o la librería acordada) salvo casos muy específicos donde el SVG personalizado sea necesario. Importa sólo los iconos usados para mantener el bundle pequeño.

- Limpieza de comentarios: elimina comentarios que solo expliquen "qué se movió" o que dupliquen lo obvio. Mantén comentarios que expliquen decisiones no triviales, trade-offs o `TODO` con contexto claro.

- Tipado y handlers: cuando uses `onChange` en inputs/selects, añade tipos explícitos (ej. `React.ChangeEvent<HTMLInputElement>` / `HTMLSelectElement`) para evitar `any` implícitos y ayudar a la revisión.

- Import paths y alias: mantén los imports con el alias `@/` cuando sea posible (evita rutas relativas profundas).

- Regla para botones con subcategorías en sidebar: al agregar un nuevo botón navegacional con subcategorías, coloca el control desplegable dentro del mismo botón, alineado al costado derecho, respetando márgenes y paddings del diseño.
- Regla operativa para ejecución: no correr builds por defecto durante tareas de implementación. Ejecutar `bun run build` solo si el usuario lo pide explícitamente.

- Mensajes y commits: al crear PRs, en la descripción indica:
  - Los archivos movidos/creados.
  - Las constantes nuevas añadidas a `src/constants`.
  - Que se ejecutaron los checks (`lint/test/build`) y el resultado.

## Política de Tests

Tras cualquier cambio importante ejecutar:

```bash
bun run lint ; bun run test
```

- Corrige errores detectados antes de abrir PR. Todo componente nuevo o modificado debe incluir/actualizar tests en `src/test/components/**`.
- Siempre que se corra un test y este de error, no quedarse atascado y buscar la fuente del componente que tiene el error. Buscar soluciones inteligentes.

## Escritura del typeado

- Evitar `any` a toda costa. Si es necesario, usar `unknown` y luego refinarlo.
- Para handlers de eventos, usar tipos explícitos: `React.ChangeEvent<HTMLInputElement>`, `HTMLSelectElement`, etc.
- Para props de componentes, definir interfaces o tipos claros y exportarlos si se reutilizan.
- Evitar tipos genéricos excesivos o complejos sin necesidad. Mantén el tipado lo más simple y directo posible para facilitar mantenimiento y revisión.

## Bun como runtime

- En lugar de usar `pnpm`, `npm` o `yarn`, se utiliza `bun` como gestor de paquetes y runtime. Tener presente `bunx` como sustituto de `npx` siempre para ejecutar scripts sin necesidad de instalarlos globalmente.

## Documentación nuevos componentes

- Para cada nuevo componente se le agregará un bloque de documentación en el mismo archivo, justo antes de la declaración del componente, con formato JSDoc. Este bloque debe incluir:
  - Descripción breve del propósito del componente.
  - Lista de props con sus tipos y una breve descripción de cada una.
  - Ejemplo de uso básico del componente.

## Aliases

- Evitar el uso del keyword `as` a toda costa posible.
