"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "#4f8ef7",
  "#2ed47a",
  "#f7b731",
  "#eb3b5a",
  "#a55eea",
  "#26de81",
];

type ChartType = "bar" | "line" | "area" | "pie";

interface ChartBlockProps {
  chartType?: ChartType;
  title?: string;
  dataJson?: string;
  xKey?: string;
  dataKeysRaw?: string;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const SAMPLE_DATA = [
  { nombre: "Ene", valor: 40 },
  { nombre: "Feb", valor: 65 },
  { nombre: "Mar", valor: 52 },
  { nombre: "Abr", valor: 80 },
  { nombre: "May", valor: 71 },
];

/**
 * Renders bar, line, area, or pie charts from configurable JSON data.
 * Used in X case: chart block previews and dynamic analytics sections.
 */
export function ChartBlock({
  chartType = "bar",
  title,
  dataJson,
  xKey = "nombre",
  dataKeysRaw = "valor",
}: ChartBlockProps) {
  const data = parseJson<Record<string, unknown>[]>(dataJson, SAMPLE_DATA);
  const dataKeys = dataKeysRaw
    ? dataKeysRaw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : ["valor"];

  return (
    <div className="w-full">
      {title && <p className="mb-3 font-semibold text-slate-700">{title}</p>}
      <ResponsiveContainer width="100%" height={280}>
        {chartType === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length] + "33"}
              />
            ))}
          </AreaChart>
        ) : (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={data}
              dataKey={dataKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
            >
              {data.map((_entry, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
