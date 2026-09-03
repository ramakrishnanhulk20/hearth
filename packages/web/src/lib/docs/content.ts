import "server-only";

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Marked, type Tokens } from "marked";
import { renderLog, renderMarkdown } from "./markdown";
import type { DocEntry, DocPage, DocSection, DocsIndex, SearchRow } from "./types";

/** Pages listed in the index whose bodies are working notes rather than documentation. */
const NOT_PUBLISHED = new Set(["PLACEHOLDERS.md"]);

const ATTACKS_DIR = "security/attacks";
const ATTACKS_SECTION = "Attack logs";
const ROOT_SECTION = "Reference";

/**
 * The markdown lives in the repository's docs/ tree, one level above this package, and is read
 * at build time only. Walking up from the working directory keeps this correct whether the build
 * runs from the workspace root or from packages/web.
 */
function docsRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(dir, "docs", "README.md"))) return join(dir, "docs");
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find the docs directory above ${process.cwd()}`);
}

function sectionLabel(dir: string): string {
  if (!dir) return ROOT_SECTION;
  const last = dir.split("/").pop() ?? dir;
  const words = last.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type IndexRow = { file: string; summary: string };

/** The table under "## Pages" in docs/README.md is the running order and the grouping. */
function readIndexTable(readme: string): IndexRow[] {
  const tokens = new Marked({ gfm: true }).lexer(readme);
  let underPages = false;
  const rows: IndexRow[] = [];

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      underPages = token.text.trim().toLowerCase() === "pages";
      continue;
    }
    if (!underPages || token.type !== "table") continue;

    for (const row of token.rows as Tokens.TableCell[][]) {
      const link = row[0]?.tokens.find((cell): cell is Tokens.Link => cell.type === "link");
      const file = link?.href ?? "";
      if (!file || NOT_PUBLISHED.has(file)) continue;
      rows.push({ file, summary: (row[1]?.text ?? "").trim() });
    }
  }

  return rows;
}

function logTitle(first: string, fallback: string): string {
  const match = /self-audit on ([^,]+)/i.exec(first);
  return match ? `Self-audit on ${match[1].trim()}` : fallback;
}

type Loaded = {
  index: DocsIndex;
  pages: Map<string, DocPage>;
};

let cached: Promise<Loaded> | null = null;

async function load(): Promise<Loaded> {
  const root = docsRoot();
  const readme = await readFile(join(root, "README.md"), "utf8");
  const table = readIndexTable(readme);

  const logFiles = existsSync(join(root, ATTACKS_DIR))
    ? (await readdir(join(root, ATTACKS_DIR))).filter((name) => name.endsWith(".log")).sort()
    : [];

  const slugOf = (file: string) => file.replace(/\.md$/, "");

  // Every route the markdown is allowed to link to, so a stale relative link cannot ship a 404.
  const routes = new Map<string, string>([["README.md", "/docs"]]);
  for (const row of table) routes.set(row.file, `/docs/${slugOf(row.file)}`);
  for (const name of logFiles) {
    routes.set(`${ATTACKS_DIR}/${name}`, `/docs/${ATTACKS_DIR}/${name.replace(/\.log$/, "")}`);
  }
  const resolve = (target: string) => routes.get(target) ?? null;

  const pages = new Map<string, DocPage>();
  const order: DocPage[] = [];

  for (const row of table) {
    // Every docs route is prerendered, so nothing here is read after the build. Without the
    // opt-out Turbopack traces the whole repository into the server bundle to be safe.
    const source = await readFile(join(/* turbopackIgnore: true */ root, row.file), "utf8");
    const dir = row.file.includes("/") ? row.file.slice(0, row.file.lastIndexOf("/")) : "";
    const rendered = await renderMarkdown({ source, dir, resolve });
    const slug = slugOf(row.file);

    const page: DocPage = {
      slug,
      href: `/docs/${slug}`,
      title: rendered.title || slug,
      summary: row.summary,
      section: sectionLabel(dir),
      kind: "markdown",
      html: rendered.html,
      headings: rendered.headings,
    };

    pages.set(slug, page);
    order.push(page);
  }

  for (const name of logFiles) {
    const source = await readFile(join(root, ATTACKS_DIR, name), "utf8");
    const lines = source.split(/\r?\n/);
    const slug = `${ATTACKS_DIR}/${name.replace(/\.log$/, "")}`;

    const page: DocPage = {
      slug,
      href: `/docs/${slug}`,
      title: logTitle(lines[0] ?? "", name),
      summary: lines.find((line) => line.startsWith("Every row below")) ?? lines[0] ?? "",
      section: ATTACKS_SECTION,
      kind: "log",
      html: renderLog(source),
      headings: [],
    };

    pages.set(slug, page);
    order.push(page);
  }

  const sections: DocSection[] = [];
  for (const page of order) {
    const entry: DocEntry = {
      slug: page.slug,
      href: page.href,
      title: page.title,
      summary: page.summary,
      section: page.section,
      kind: page.kind,
    };
    const bucket = sections.find((section) => section.name === page.section);
    if (bucket) bucket.pages.push(entry);
    else sections.push({ name: page.section, pages: [entry] });
  }

  const search: SearchRow[] = [];
  for (const page of order) {
    search.push({ href: page.href, title: page.title, section: page.section, heading: null });
    for (const heading of page.headings) {
      search.push({
        href: `${page.href}#${heading.id}`,
        title: page.title,
        section: page.section,
        heading: heading.text,
      });
    }
  }

  const introSource = readme.split(/^## Pages\s*$/m)[0] ?? "";
  const intro = await renderMarkdown({ source: introSource, dir: "", resolve });

  return {
    index: { intro: intro.html, sections, order: sections.flatMap((section) => section.pages), search },
    pages,
  };
}

function loaded(): Promise<Loaded> {
  cached ??= load();
  return cached;
}

export async function getDocsIndex(): Promise<DocsIndex> {
  return (await loaded()).index;
}

export async function getDocPage(slug: string): Promise<DocPage | null> {
  return (await loaded()).pages.get(slug) ?? null;
}

export async function getDocSlugs(): Promise<string[]> {
  return [...(await loaded()).pages.keys()];
}

/** The page before and after this one, in the order the index table sets. */
export async function getNeighbours(slug: string): Promise<{ previous: DocEntry | null; next: DocEntry | null }> {
  const { order } = (await loaded()).index;
  const at = order.findIndex((entry) => entry.slug === slug);
  if (at < 0) return { previous: null, next: null };
  return { previous: order[at - 1] ?? null, next: order[at + 1] ?? null };
}
