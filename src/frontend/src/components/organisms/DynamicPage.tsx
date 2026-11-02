import type { PageConfig } from "@/lib/pageConfigTypes";
import { renderBlock } from "@/lib/blockRegistry";

interface DynamicPageProps {
  config: PageConfig;
}

/**
 * Renders page-builder blocks sorted by order from a page config.
 * Used in X case: dynamic content pages resolved by slug configuration.
 */
export function DynamicPage({ config }: DynamicPageProps) {
  const sorted = [...config.blocks].sort((a, b) => a.order - b.order);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-800">
        {config.title}
      </h1>
      {config.description && (
        <p className="mb-6 text-slate-500">{config.description}</p>
      )}
      <div className="flex flex-col gap-6">
        {sorted.map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    </div>
  );
}
