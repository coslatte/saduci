import React from "react";
import { Divider } from "@/components/atoms";
import { LinkCard } from "@/components/molecules";
import { TextBlock } from "@/components/organisms/blocks/TextBlock";
import { CardBlock } from "@/components/organisms/blocks/CardBlock";
import { AlertBlock } from "@/components/organisms/blocks/AlertBlock";
import { BadgeBlock } from "@/components/organisms/blocks/BadgeBlock";
import { ImageBlock } from "@/components/organisms/blocks/ImageBlock";
import { ChartBlock } from "@/components/organisms/blocks/ChartBlock";
import { TableBlock } from "@/components/organisms/blocks/TableBlock";
import { ButtonBlock } from "@/components/organisms/blocks/ButtonBlock";
import { InputFieldBlock } from "@/components/organisms/blocks/InputFieldBlock";
import { SelectFieldBlock } from "@/components/organisms/blocks/SelectFieldBlock";
import type { BlockType, PageBlock } from "@/lib/pageConfigTypes";

export interface PropFieldSchema {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean" | "taglist";
  options?: string[];
}

export interface BlockRegistryEntry {
  label: string;
  description: string;
  defaultProps: Record<string, unknown>;
  propSchema: PropFieldSchema[];
  render: (props: Record<string, unknown>) => React.ReactNode;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockRegistryEntry> = {
  text: {
    label: "Texto",
    description: "Párrafo o encabezado",
    defaultProps: {
      content: "Escribe aquí...",
      as: "p",
      size: "base",
      weight: "normal",
      muted: false,
    },
    propSchema: [
      { key: "content", label: "Contenido", type: "textarea" },
      {
        key: "as",
        label: "Elemento HTML",
        type: "select",
        options: ["p", "h1", "h2", "h3", "h4", "span"],
      },
      {
        key: "size",
        label: "Tamaño",
        type: "select",
        options: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"],
      },
      {
        key: "weight",
        label: "Peso",
        type: "select",
        options: ["normal", "medium", "semibold", "bold"],
      },
      { key: "muted", label: "Atenuado", type: "boolean" },
    ],
    render: (props) => (
      <TextBlock {...(props as Parameters<typeof TextBlock>[0])} />
    ),
  },

  card: {
    label: "Tarjeta",
    description: "Tarjeta con título y contenido",
    defaultProps: { header: "Título", content: "Contenido de la tarjeta." },
    propSchema: [
      { key: "header", label: "Título", type: "text" },
      { key: "content", label: "Contenido", type: "textarea" },
    ],
    render: (props) => (
      <CardBlock {...(props as Parameters<typeof CardBlock>[0])} />
    ),
  },

  alert: {
    label: "Alerta",
    description: "Bloque informativo o de advertencia",
    defaultProps: {
      variant: "info",
      title: "Información",
      message: "Mensaje de la alerta.",
    },
    propSchema: [
      {
        key: "variant",
        label: "Tipo",
        type: "select",
        options: ["info", "success", "warning", "danger"],
      },
      { key: "title", label: "Título", type: "text" },
      { key: "message", label: "Mensaje", type: "textarea" },
    ],
    render: (props) => (
      <AlertBlock {...(props as Parameters<typeof AlertBlock>[0])} />
    ),
  },

  divider: {
    label: "Divisor",
    description: "Separador horizontal",
    defaultProps: {},
    propSchema: [],
    render: () => <Divider />,
  },

  badge: {
    label: "Etiqueta",
    description: "Chip o badge de estado",
    defaultProps: { tags: [{ label: "Etiqueta", color: "#3b82f6" }] },
    propSchema: [{ key: "tags", label: "Tags", type: "taglist" }],
    render: (props) => (
      <BadgeBlock {...(props as Parameters<typeof BadgeBlock>[0])} />
    ),
  },

  linkcard: {
    label: "Tarjeta enlace",
    description: "Tarjeta con link externo",
    defaultProps: {
      label: "Recurso",
      href: "https://",
      description: "Descripción del enlace",
    },
    propSchema: [
      { key: "label", label: "Título", type: "text" },
      { key: "href", label: "URL", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
    ],
    render: (props) => (
      <LinkCard
        label={String(props.label ?? "")}
        href={String(props.href ?? "#")}
        description={props.description ? String(props.description) : undefined}
      />
    ),
  },

  image: {
    label: "Imagen",
    description: "Imagen desde URL",
    defaultProps: { src: "", alt: "Imagen", caption: "" },
    propSchema: [
      { key: "src", label: "URL de imagen", type: "text" },
      { key: "alt", label: "Texto alternativo", type: "text" },
      { key: "caption", label: "Leyenda", type: "text" },
    ],
    render: (props) => (
      <ImageBlock {...(props as Parameters<typeof ImageBlock>[0])} />
    ),
  },

  chart: {
    label: "Gráfico",
    description: "Bar, línea, área o pie (Recharts)",
    defaultProps: {
      chartType: "bar",
      title: "Gráfico",
      xKey: "nombre",
      dataKeysRaw: "valor",
      dataJson: JSON.stringify([
        { nombre: "Ene", valor: 40 },
        { nombre: "Feb", valor: 65 },
        { nombre: "Mar", valor: 52 },
        { nombre: "Abr", valor: 80 },
      ]),
    },
    propSchema: [
      {
        key: "chartType",
        label: "Tipo de gráfico",
        type: "select",
        options: ["bar", "line", "area", "pie"],
      },
      { key: "title", label: "Título", type: "text" },
      { key: "xKey", label: "Clave eje X (field name)", type: "text" },
      {
        key: "dataKeysRaw",
        label: "Claves de datos (separadas por coma)",
        type: "text",
      },
      { key: "dataJson", label: "Datos (JSON)", type: "textarea" },
    ],
    render: (props) => (
      <ChartBlock {...(props as Parameters<typeof ChartBlock>[0])} />
    ),
  },

  table: {
    label: "Tabla",
    description: "Tabla de datos configurable",
    defaultProps: {
      title: "Tabla",
      columnsJson: JSON.stringify([
        { key: "nombre", label: "Nombre" },
        { key: "valor", label: "Valor" },
      ]),
      rowsJson: JSON.stringify([
        { nombre: "Fila 1", valor: "--" },
        { nombre: "Fila 2", valor: "--" },
      ]),
    },
    propSchema: [
      { key: "title", label: "Título", type: "text" },
      { key: "columnsJson", label: "Columnas (JSON)", type: "textarea" },
      { key: "rowsJson", label: "Filas (JSON)", type: "textarea" },
    ],
    render: (props) => (
      <TableBlock {...(props as Parameters<typeof TableBlock>[0])} />
    ),
  },

  button: {
    label: "Botón",
    description: "Botón de acción configurable",
    defaultProps: {
      label: "Botón",
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
    propSchema: [
      { key: "label", label: "Texto", type: "text" },
      {
        key: "variant",
        label: "Variante",
        type: "select",
        options: [
          "primary",
          "secondary",
          "outline",
          "ghost",
          "danger",
          "success",
        ],
      },
      {
        key: "size",
        label: "Tamaño",
        type: "select",
        options: ["xs", "sm", "md", "lg", "xl"],
      },
      { key: "fullWidth", label: "Ancho completo", type: "boolean" },
      { key: "href", label: "URL (opcional)", type: "text" },
    ],
    render: (props) => (
      <ButtonBlock {...(props as Parameters<typeof ButtonBlock>[0])} />
    ),
  },

  inputfield: {
    label: "Campo de texto",
    description: "Input de formulario con etiqueta",
    defaultProps: {
      label: "Campo",
      placeholder: "Escribe aquí...",
      type: "text",
      required: false,
    },
    propSchema: [
      { key: "label", label: "Etiqueta", type: "text" },
      { key: "placeholder", label: "Placeholder", type: "text" },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        options: ["text", "email", "number", "password", "tel"],
      },
      { key: "required", label: "Requerido", type: "boolean" },
      { key: "helperText", label: "Texto de ayuda", type: "text" },
    ],
    render: (props) => (
      <InputFieldBlock {...(props as Parameters<typeof InputFieldBlock>[0])} />
    ),
  },

  selectfield: {
    label: "Desplegable",
    description: "Select de opciones configurable",
    defaultProps: {
      label: "Selección",
      placeholder: "Selecciona una opción",
      optionsRaw: "Opción 1,Opción 2,Opción 3",
      required: false,
    },
    propSchema: [
      { key: "label", label: "Etiqueta", type: "text" },
      { key: "placeholder", label: "Placeholder", type: "text" },
      {
        key: "optionsRaw",
        label: "Opciones (separadas por coma)",
        type: "text",
      },
      { key: "required", label: "Requerido", type: "boolean" },
      { key: "helperText", label: "Texto de ayuda", type: "text" },
    ],
    render: (props) => (
      <SelectFieldBlock
        {...(props as Parameters<typeof SelectFieldBlock>[0])}
      />
    ),
  },
};

export function renderBlock(block: PageBlock): React.ReactNode {
  const entry = BLOCK_REGISTRY[block.type];
  if (!entry) return null;
  return entry.render(block.props ?? {});
}
