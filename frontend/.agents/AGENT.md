# AGENT.md — Instrucciones para Agentes de IA

Este archivo provee directrices específicas para cualquier agente de IA (Antigravity, Copilot, Cursor, etc.) que trabaje sobre este repositorio.

## Filosofía de Documentación del Código

El proyecto está en desarrollo activo. Las siguientes reglas rigen la documentación durante esta etapa:

### Documentar solo lo que no es evidente

Añade comentarios **únicamente** a funciones o bloques cuyo funcionamiento **no sea inmediatamente comprensible** por su nombre, estructura o contexto. Criterios:

- Lógica matemática o algorítmica compleja (ej. cálculos de simulación, transformaciones de datos).
- Side effects no obvios o comportamiento condicional difícil de rastrear.
- Workarounds o hacks que existan por razones técnicas específicas (ej. limitaciones de la librería, bugs de React, etc.).
- Funciones con muchos parámetros cuyo contrato no sea evidente.

### No documentar lo autoexplicativo

No añadas comentarios a:

- Funciones con nombres descriptivos y lógica trivial.
- Props, variables y hooks cuyo propósito sea claro por contexto.
- Componentes de UI con estructura estándar (map, filter, render condicional simple).

### No crear archivos de documentación

Durante la fase de desarrollo **no se deben crear**:

- Archivos `.md` de documentación de componentes o módulos.
- Carpetas `/docs` ni wikis internas.
- READMEs internos de subcarpetas.

La única excepción es este archivo `AGENT.md` y el `README.md` raíz del proyecto.

## Stack Técnico

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: CSS Modules (Vanilla CSS)
- **Gestor de paquetes**: Bun (usar `bun` en lugar de `npm` o `yarn`)

## Convenciones del Proyecto

- Componentes en `src/components/` organizados por atomicidad: `atoms/`, `molecules/`, `organisms/`, `layout/`.
- Páginas en `src/app/` siguiendo la convención de Next.js App Router.
- Estilos globales en `src/app/globals.css`.
- No usar Tailwind CSS. Solo CSS Modules o `globals.css`.

## Evitar por todos los medios

Uso constante de emojis y demás cosas que son innecesarias para el código.

## Regla de navegación lateral

- Al agregar un nuevo botón en el sidebar que tenga subcategorías, el control desplegable debe ir dentro del mismo botón, alineado al costado derecho y respetando márgenes/paddings del diseño.

## Regla de ejecución de builds

- No ejecutar `build` por defecto durante cambios de implementación o refactor.
- Ejecutar `build` únicamente cuando el usuario lo solicite explícitamente.
