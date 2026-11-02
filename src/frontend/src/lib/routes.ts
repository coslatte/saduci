export const routes = {
  home: "/",
  simulation: "/simulation",
  statistics: "/statistics",
  usuarios: "/usuarios",
  settings: "/settings",
  admin: "/admin",
  pages: "/pages",
} as const;

export type Route = (typeof routes)[keyof typeof routes];
