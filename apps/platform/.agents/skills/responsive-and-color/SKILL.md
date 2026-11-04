---
name: responsive-and-color
description: Evalúa y ajusta la responsividad y el color de una vista. Úsala al crear o modificar un componente o una página, al elegir entre flex y grid, al fijar tamaños, y al definir o ajustar colores.
---

# Responsive y color

Una vista tiene que comportarse bien en anchos distintos y no depender del
color para comunicar lo importante. Revisa ambas dimensiones antes de darla por
terminada.

## Grid por defecto, flex con motivo

Grid distribuye en dos dimensiones; flex, en una. Elige según lo que resuelves:

| Layout | Usa |
|---|---|
| Filas y columnas que se alinean entre sí | `grid` con `grid-cols-*` |
| Grupo de tarjetas que se reacomodan solo | `grid` con `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Barra con elementos a los extremos | `flex justify-between` |
| Fila que cambia a columna en pantalla chica | `flex flex-col sm:flex-row` |
| Centrar un bloque en ambas ejes | `grid place-items-center` |

No uses flex para simular una rejilla: cada hijo necesita `w-1/2` y
`flex-wrap`, y la alineación entre filas se rompe en cuanto las alturas
difieren. Con `grid` las filas se alinean solas.

## Tamaños fluidos

- Prefiere `w-full`, `max-w-*`, `h-auto`, `min-h-*` a medidas fijas en píxeles.
- Prefiere `rem` y unidades relativas a `px` para tipografía.
- Un ancho fijo se justifica solo con un comentario. `max-w` casi siempre basta.
- Para el breakpoint de pantalla chica, empieza por móvil: define el layout base
  y ve sumando `sm:`, `md:`, `lg:`.

## Revisión de responsividad

Antes de entregar una vista, comprueba:

1. **Ancho mínimo**: 360px, sin desbordes horizontales ni texto cortado.
2. **Ancho de escritorio**: 1440px, sin líneas huérfanas ni columnas de contenido
   que se estiren a más de lo legible.
3. **Tablas**: envuelven en un contenedor con `overflow-x-auto` y fijan un
   `min-w-*` en la tabla.
4. **Barras laterales**: en móvil se ocultan o se vuelven un drawer. Si una barra
   lateral ocupa `w-72` fijos, colócala bajo un breakpoint.
5. **Formularios**: los campos pasan a ancho completo en móvil.

## Color

- **Nada de colores saturados.** Usa matices bajos y medios para superficies y
  bordes, y reserva la saturación alta para el elemento que debe llamar la
  atención.
- **Contraste suficiente** en texto: el texto normal sobre su fondo debe cumplir
  relación de contraste 4.5:1 como mínimo; 3:1 para texto grande.
- **No comuniques solo con color.** Un estado de error lleva icono y texto, no
  solo un borde rojo.
- **Modo claro y oscuro** van juntos. Si añades una superficie, revisa que
  también tenga su contraparte.
- Paleta del proyecto: `slate` para texto y superficies neutras, `zinc` en
  bordes, y un color de acento solo para acciones primarias y estados.
- Los colores de estado (`Badge status="danger"`) salen de un mapa por variante,
  nunca de un hex suelto en el componente.

## Al revisar código

- Busca `flex` donde debería haber `grid`.
- Busca `w-[` con píxeles y `style={{ width: ... }}` en un componente de layout.
- Busca hexadecimales sueltos fuera de los mapas de variantes.
- Comprueba que ninguna etiqueta dependa solo del color para distinguirse.
