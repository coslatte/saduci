"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { PageConfig, PageBlock, BlockType } from "@/lib/pageConfigTypes";
import pageConfigService from "@/lib/pageConfigService";
import { BLOCK_REGISTRY } from "@/lib/blockRegistry";

interface PageBuilderContextValue {
  pages: PageConfig[];
  loading: boolean;
  refreshPages: () => Promise<void>;
  createPage: (
    data: Omit<PageConfig, "id" | "blocks" | "createdAt" | "updatedAt">,
  ) => Promise<PageConfig>;
  deletePage: (id: string) => Promise<void>;
  getPage: (id: string) => PageConfig | undefined;
  addBlock: (pageId: string, type: BlockType) => Promise<void>;
  removeBlock: (pageId: string, blockId: string) => Promise<void>;
  updateBlock: (
    pageId: string,
    blockId: string,
    props: Record<string, unknown>,
  ) => Promise<void>;
  moveBlock: (
    pageId: string,
    blockId: string,
    direction: "up" | "down",
  ) => Promise<void>;
  reorderBlocks: (
    pageId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;
  updatePageMeta: (
    id: string,
    data: Partial<Omit<PageConfig, "id" | "blocks">>,
  ) => Promise<void>;
}

const PageBuilderContext = createContext<PageBuilderContextValue | undefined>(
  undefined,
);

export function PageBuilderProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPages = useCallback(async () => {
    try {
      const data = await pageConfigService.getPages();
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPages();
  }, [refreshPages]);

  const createPage = useCallback(
    async (
      data: Omit<PageConfig, "id" | "blocks" | "createdAt" | "updatedAt">,
    ) => {
      const created = await pageConfigService.createPage({
        ...data,
        blocks: [],
      });
      await refreshPages();
      return created;
    },
    [refreshPages],
  );

  const deletePage = useCallback(async (id: string) => {
    await pageConfigService.deletePage(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPage = useCallback(
    (id: string) => pages.find((p) => p.id === id),
    [pages],
  );

  const addBlock = useCallback(
    async (pageId: string, type: BlockType) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const entry = BLOCK_REGISTRY[type];
      const newBlock: PageBlock = {
        id: crypto.randomUUID(),
        type,
        order: page.blocks.length,
        props: { ...entry.defaultProps },
      };
      const updated = await pageConfigService.updatePage(pageId, {
        blocks: [...page.blocks, newBlock],
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
    },
    [pages],
  );

  const removeBlock = useCallback(
    async (pageId: string, blockId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const updated = await pageConfigService.updatePage(pageId, {
        blocks: page.blocks.filter((b) => b.id !== blockId),
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
    },
    [pages],
  );

  const updateBlock = useCallback(
    async (pageId: string, blockId: string, props: Record<string, unknown>) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const updatedBlocks = page.blocks.map((b) =>
        b.id === blockId ? { ...b, props: { ...b.props, ...props } } : b,
      );
      const updated = await pageConfigService.updatePage(pageId, {
        blocks: updatedBlocks,
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
    },
    [pages],
  );

  const moveBlock = useCallback(
    async (pageId: string, blockId: string, direction: "up" | "down") => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const sorted = [...page.blocks].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const tmp = sorted[idx].order;
      sorted[idx].order = sorted[swapIdx].order;
      sorted[swapIdx].order = tmp;
      const reordered = sorted.map((b, i) => ({ ...b, order: i }));
      const updated = await pageConfigService.updatePage(pageId, {
        blocks: reordered,
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
    },
    [pages],
  );

  const updatePageMeta = useCallback(
    async (id: string, data: Partial<Omit<PageConfig, "id" | "blocks">>) => {
      const updated = await pageConfigService.updatePage(id, data);
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [],
  );

  const reorderBlocks = useCallback(
    async (pageId: string, fromIndex: number, toIndex: number) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const sorted = [...page.blocks].sort((a, b) => a.order - b.order);
      if (fromIndex < 0 || fromIndex >= sorted.length) return;
      if (toIndex < 0 || toIndex >= sorted.length) return;
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      const reordered = sorted.map((b, i) => ({ ...b, order: i }));
      const updated = await pageConfigService.updatePage(pageId, {
        blocks: reordered,
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
    },
    [pages],
  );

  return (
    <PageBuilderContext.Provider
      value={{
        pages,
        loading,
        refreshPages,
        createPage,
        deletePage,
        getPage,
        addBlock,
        removeBlock,
        updateBlock,
        moveBlock,
        reorderBlocks,
        updatePageMeta,
      }}
    >
      {children}
    </PageBuilderContext.Provider>
  );
}

export function usePageBuilder(): PageBuilderContextValue {
  const ctx = useContext(PageBuilderContext);
  if (!ctx)
    throw new Error("usePageBuilder must be used within PageBuilderProvider");
  return ctx;
}
