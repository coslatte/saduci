---
name: react-without-usememo
description: No usar useMemo. Úsala al revisar o escribir un componente de React que memorice un valor derivado, antes de añadir una dependencia de memoización, y cuando revises código existente que la use.
---

# React sin useMemo

`useMemo` no se usa en este proyecto. Su razón de existir es evitar recalcular
un valor entre renders, y en este frontend casi ningún caso lo justifica: los
valores derivados son baratos y las props que los alimentan suelen ser literales
inline, cuya identidad cambia en cada render y anula la memoización.

## Sustitutos por caso

| Necesitas | Usa |
|---|---|
| Calcular un valor a partir de props o estado | Cálculo directo en el cuerpo del componente |
| Una tabla de filas a partir de un array | Función de módulo, llamada en render |
| Definiciones de columnas para TanStack Table | Función de módulo que traduzca las props |
| Un Set de claves a partir de otra colección | Función de módulo pura |
| Permisos derivados del rol | Un objeto literal en el cuerpo |
| Un valor costoso | `useState` con inicializador perezoso, o `useTransition` |

## Patrón: función de módulo

La forma que más se repite aquí es sacar el cálculo a una función de módulo. El
componente queda con una línea y la lógica queda testeable por separado.

```tsx
// Incorrecto: el array se reconstruye igual en cada render
const tableRows = useMemo(
  () => records.map((record) => ({ id: record.id, name: record.name })),
  [records],
);

// Correcto: la función es pura y el componente la invoca
function buildRows(records: Record[]) {
  return records.map((record) => ({ id: record.id, name: record.name }));
}

function Page() {
  const [records, setRecords] = useState<Record[]>([]);
  const tableRows = buildRows(records);
  // ...
}
```

## Lo que no es el sustituto

Una Promise no reemplaza a `useMemo`. `useMemo` calcula un valor síncrono y lo
conserva. Una Promise modela un resultado asíncrono. Meter una Promise donde
había un cálculo síncrono cambia el tipo del dato, obliga a manejar estado de
carga y de error, y no elimina el recálculo: lo convierte en trabajo asíncrono.

Para datos que vienen de la red, el patrón correcto ya está en el proyecto:
Server Actions, Server Components o `apiFetch`, no un `useMemo` con una
promesa dentro.

## Contexto y estado

Para un valor de contexto, el objeto que se entrega sí importa. Si el contexto
mezcla estado y acciones, separarlo en dos contextos: uno para el estado y otro
para las acciones, que son estables con `useCallback`. Así, un cambio de estado
no invalida las acciones.

## Al revisar código

- No reañadas `useMemo` por reflejo. Pregunta primero si el cálculo es caro.
- Si el cálculo es trivial (un número, un `filter`, un `map` sobre una lista
  corta), elimínalo.
- Si el cálculo es genuinamente caro, escribe el motivo en un comentario. La
  excepción se documenta, no se asume.
