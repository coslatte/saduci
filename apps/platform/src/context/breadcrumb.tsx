"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

interface BreadcrumbLabel {
  pathname: string;
  label: string;
}

interface BreadcrumbContextValue {
  currentLabel: BreadcrumbLabel | null;
  setCurrentLabel: (pathname: string, label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  currentLabel: null,
  setCurrentLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [currentLabel, setCurrentLabelState] = useState<BreadcrumbLabel | null>(
    null,
  );

  const setCurrentLabel = useCallback(
    (pathname: string, label: string | null) => {
      setCurrentLabelState((current) => {
        if (label !== null) return { pathname, label };
        return current?.pathname === pathname ? null : current;
      });
    },
    [],
  );

  return (
    <BreadcrumbContext.Provider value={{ currentLabel, setCurrentLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbLabel() {
  return useContext(BreadcrumbContext);
}
