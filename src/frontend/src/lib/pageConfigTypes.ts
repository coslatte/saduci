export type BlockType =
  | "text"
  | "card"
  | "alert"
  | "divider"
  | "badge"
  | "linkcard"
  | "image"
  | "chart"
  | "table"
  | "button"
  | "inputfield"
  | "selectfield";

export interface PageBlock {
  id: string;
  type: BlockType;
  order: number;
  props?: Record<string, unknown>;
}

export interface PageConfig {
  id: string;
  slug: string;
  title: string;
  description?: string;
  blocks: PageBlock[];
  showInSidebar?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default PageConfig;
