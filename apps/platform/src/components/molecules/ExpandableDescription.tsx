"use client";

import { useEffect, useId, useRef, useState } from "react";

interface ExpandableDescriptionProps {
  summary: string;
  children: string;
}

export function ExpandableDescription({
  summary,
  children,
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const textRef = useRef<HTMLSpanElement>(null);
  const [fullHeight, setFullHeight] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    const updateHeight = () => {
      if (textRef.current) setFullHeight(textRef.current.scrollHeight);
    };
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [expanded]);

  return (
    <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => {
          if (!expanded && textRef.current)
            setFullHeight(textRef.current.scrollHeight);
          setExpanded((current) => !current);
        }}
        className="block w-full cursor-pointer rounded-sm text-left focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <span
          id={detailId}
          ref={textRef}
          style={{ maxHeight: expanded ? `${fullHeight}px` : "3rem" }}
          className={`block overflow-hidden transition-[max-height,mask-size] duration-300 ease-out motion-reduce:transition-none ${
            expanded
              ? ""
              : "[mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]"
          }`}
        >
          {summary} {children}
        </span>
        <span className="sr-only">
          {expanded ? "Colapsar descripción" : "Expandir descripción"}
        </span>
      </button>
    </div>
  );
}
