export const routes = {
  home: "/",
  simulation: "/simulation",
  statistics: "/statistics",
  usuarios: "/usuarios",
  settings: "/settings",
} as const;

export type Route = (typeof routes)[keyof typeof routes];
