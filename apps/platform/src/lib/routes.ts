export const routes = {
  home: "/home",
  simulation: "/simulation",
  statistics: "/statistics",
  prediction: "/prediction",
  predictionExplanations: "/prediction/explanations",
  recordsSimulations: "/records/simulations",
  recordsPredictions: "/records/predictions",
  recordsStatistics: "/records/statistics",
  users: "/admin/users",
  settings: "/settings",
  admin: "/admin",
  pages: "/pages",
} as const;

export type Route = (typeof routes)[keyof typeof routes];
