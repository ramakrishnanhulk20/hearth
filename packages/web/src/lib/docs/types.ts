/**
 * Shapes shared between the build-time loader and the client shell.
 *
 * Kept free of node imports so the sidebar, the search box and the outline can import them
 * without pulling the filesystem reader into the browser bundle.
 */

export type Heading = {
  id: string;
  text: string;
  depth: 2 | 3;
};

/** A markdown page renders to prose. A log is an executed attack run, shown as raw text. */
export type DocKind = "markdown" | "log";

export type DocEntry = {
  /** Path under docs/ with the extension dropped, for example "concepts/how-a-draw-works". */
  slug: string;
  href: string;
  title: string;
  summary: string;
  /** A key in the `docs.sections` namespace, or the folder's own name where none is set. */
  section: string;
  kind: DocKind;
};

export type DocSection = {
  name: string;
  pages: DocEntry[];
};

export type DocPage = DocEntry & {
  html: string;
  headings: Heading[];
  /** True when this language has no file for the page yet, so the English one is being shown. */
  englishFallback: boolean;
};

/** One hit the search box can offer: a page, or a heading inside a page. */
export type SearchRow = {
  href: string;
  title: string;
  section: string;
  heading: string | null;
};

export type DocsIndex = {
  intro: string;
  sections: DocSection[];
  order: DocEntry[];
  search: SearchRow[];
};
