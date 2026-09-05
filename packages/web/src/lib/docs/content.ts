import "server-only";

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Marked, type Tokens } from "marked";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { renderLog, renderMarkdown } from "./markdown";
import type { DocEntry, DocPage, DocSection, DocsIndex, SearchRow } from "./types";

/** An index row can outlive its page, so a row with no file on disk is skipped rather than fatal. */
const NOT_PUBLISHED = new Set<string>();

const ATTACKS_DIR = "security/attacks";
const ATTACKS_SECTION = "attackLogs";
const ROOT_SECTION = "reference";

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

/**
 * Where a language's translated pages live: docs/i18n/<locale>/, mirroring the English tree.
 *
 * A translator copies a file across, translates it, and the page appears in that language. A file
 * they have not reached yet is not an error and not a gap: the English one renders in its place
 * with one line at the top saying so.
 */
function translationRoot(root: string, locale: string): string | null {
  // The folder is not required to exist. A language nobody has started still says, on every page,
  // that what the reader is looking at is the English one, which is the honest thing for a site
  // that offers sixteen languages to say about the fifteen it has not finished.
  return locale === DEFAULT_LOCALE ? null : join(root, "i18n", locale);
}

/**
 * The group a page sits in, as a message key rather than a word.
 *
 * A folder becomes a key by its own name, so `docs/concepts` groups under `concepts` and the
 * sidebar looks that up in `docs.sections`. A folder nobody has named there falls back to its own
 * capitalised name, which is what a new folder should do rather than printing a bare key.
 */
function sectionLabel(dir: string): string {
  if (!dir) return ROOT_SECTION;
  const last = dir.split("/").pop() ?? dir;
  return last.replace(/-/g, "");
}

type IndexRow = { file: string; title: string; summary: string };

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
      rows.push({ file, title: (link?.text ?? "").trim(), summary: (row[1]?.text ?? "").trim() });
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

/** One parse per language, held for the life of the build. */
const cached = new Map<string, Promise<Loaded>>();

async function load(locale: string): Promise<Loaded> {
  const root = docsRoot();
  const translated = translationRoot(root, locale);

  const readme = await readFile(join(root, "README.md"), "utf8");
  const table = readIndexTable(readme);

  // A locale's own README, if the translator wrote one, carries the titles and summaries for the
  // sidebar. Its running order is still the English one, so a page cannot go missing by being left
  // out of a translated index.
  const titles = new Map<string, string>();
  const summaries = new Map<string, string>();
  if (translated && existsSync(join(translated, "README.md"))) {
    const localised = await readFile(join(translated, "README.md"), "utf8");
    for (const row of readIndexTable(localised)) {
      // The English index writes the file path as the link text, so a row that still says the path
      // has not been given a title and the page's own heading is used instead.
      if (row.title && row.title !== row.file) titles.set(row.file, row.title);
      if (row.summary) summaries.set(row.file, row.summary);
    }
  }

  const logFiles = existsSync(join(root, ATTACKS_DIR))
    ? (await readdir(join(root, ATTACKS_DIR))).filter((name) => name.endsWith(".log")).sort()
    : [];

  const slugOf = (file: string) => file.replace(/\.md$/, "");

  // The prose renders to a plain <a href>, which no router will ever prefix for us, so a link
  // inside a page carries the locale itself. Everything the app links with next-intl's Link keeps
  // the bare path and lets the router add the prefix, which is why the two differ here.
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  // Every route the markdown is allowed to link to, so a stale relative link cannot ship a 404.
  const routes = new Map<string, string>([["README.md", `${prefix}/docs`]]);
  for (const row of table) routes.set(row.file, `${prefix}/docs/${slugOf(row.file)}`);
  for (const name of logFiles) {
    routes.set(
      `${ATTACKS_DIR}/${name}`,
      `${prefix}/docs/${ATTACKS_DIR}/${name.replace(/\.log$/, "")}`,
    );
  }
  const resolve = (target: string) => routes.get(target) ?? null;

  const pages = new Map<string, DocPage>();
  const order: DocPage[] = [];

  for (const row of table) {
    const localFile = translated ? join(translated, row.file) : null;
    const translatedHere = localFile !== null && existsSync(localFile);

    // Every docs route is prerendered, so nothing here is read after the build. Without the
    // opt-out Turbopack traces the whole repository into the server bundle to be safe.
    const source = translatedHere
      ? await readFile(/* turbopackIgnore: true */ localFile, "utf8")
      : await readFile(join(/* turbopackIgnore: true */ root, row.file), "utf8");
    const dir = row.file.includes("/") ? row.file.slice(0, row.file.lastIndexOf("/")) : "";
    const rendered = await renderMarkdown({ source, dir, resolve });
    const slug = slugOf(row.file);

    const page: DocPage = {
      slug,
      href: `/docs/${slug}`,
      title: titles.get(row.file) ?? rendered.title ?? slug,
      summary: summaries.get(row.file) ?? row.summary,
      section: sectionLabel(dir),
      kind: "markdown",
      html: rendered.html,
      headings: rendered.headings,
      // English is never a fallback of itself, and a page that was translated does not carry the
      // note either. Only the third case, a language whose translator has not reached this page.
      englishFallback: translated !== null && !translatedHere,
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
      // An attack log is the raw output of a script we ran. Translating it would be inventing
      // evidence, so it stays exactly as the run printed it and never claims to be translated.
      englishFallback: false,
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

  const introSource = translated && existsSync(join(translated, "README.md"))
    ? await readFile(/* turbopackIgnore: true */ join(translated, "README.md"), "utf8")
    : readme;
  const intro = await renderMarkdown({
    source: introSource.split(/^## Pages\s*$/m)[0] ?? "",
    dir: "",
    resolve,
  });

  return {
    index: { intro: intro.html, sections, order: sections.flatMap((section) => section.pages), search },
    pages,
  };
}

function loaded(locale: string): Promise<Loaded> {
  let found = cached.get(locale);
  if (!found) {
    found = load(locale);
    cached.set(locale, found);
  }
  return found;
}

export async function getDocsIndex(locale: string): Promise<DocsIndex> {
  return (await loaded(locale)).index;
}

export async function getDocPage(locale: string, slug: string): Promise<DocPage | null> {
  return (await loaded(locale)).pages.get(slug) ?? null;
}

/** The slugs are the same in every language, so the routes come from English and cost one parse. */
export async function getDocSlugs(): Promise<string[]> {
  return [...(await loaded(DEFAULT_LOCALE)).pages.keys()];
}

/** The page before and after this one, in the order the index table sets. */
export async function getNeighbours(
  locale: string,
  slug: string,
): Promise<{ previous: DocEntry | null; next: DocEntry | null }> {
  const { order } = (await loaded(locale)).index;
  const at = order.findIndex((entry) => entry.slug === slug);
  if (at < 0) return { previous: null, next: null };
  return { previous: order[at - 1] ?? null, next: order[at + 1] ?? null };
}
