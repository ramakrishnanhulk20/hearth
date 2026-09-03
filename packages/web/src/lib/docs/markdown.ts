import "server-only";

import { Marked } from "marked";
import { createHighlighter, type Highlighter, type ThemeRegistrationRaw } from "shiki";
import type { Heading } from "./types";

/**
 * The code theme, written against the site's own palette rather than borrowed from an editor,
 * so a snippet sits inside the page instead of looking pasted in from VS Code.
 */
const HEARTH_CODE: ThemeRegistrationRaw = {
  name: "hearth",
  type: "dark",
  fg: "#d8d5cf",
  bg: "#0a0a0a",
  settings: [
    { settings: { foreground: "#d8d5cf", background: "#0a0a0a" } },
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: { foreground: "#6d6a63", fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.other",
        "storage",
        "storage.type",
        "storage.modifier",
        "constant.language",
        "support.type.builtin",
      ],
      settings: { foreground: "#f9d100" },
    },
    {
      scope: ["string", "string.quoted", "constant.character.escape", "constant.numeric"],
      settings: { foreground: "#f0b25a" },
    },
    {
      scope: ["entity.name.type", "support.type", "entity.other.inherited-class", "support.class"],
      settings: { foreground: "#9ed8c6" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call", "variable.function"],
      settings: { foreground: "#f2efe9" },
    },
    {
      scope: ["variable", "variable.parameter", "variable.other", "meta.parameters"],
      settings: { foreground: "#b6b2aa" },
    },
    {
      scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"],
      settings: { foreground: "#84817b" },
    },
  ],
};

const CODE_LANGUAGES = ["solidity", "bash"] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function highlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({ themes: [HEARTH_CODE], langs: [...CODE_LANGUAGES] });
  return highlighterPromise;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** GitHub's heading anchor rules, so an anchor copied from the repository still lands here. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export type LinkResolver = (target: string) => string | null;

export type RenderInput = {
  source: string;
  /** Directory of the page inside docs/, used to resolve its relative links. */
  dir: string;
  /** Maps a path relative to docs/ onto a route, or returns null when the page is not published. */
  resolve: LinkResolver;
};

export type RenderResult = {
  title: string;
  html: string;
  headings: Heading[];
};

/** Resolves "../security/threat-model.md" against the page's own directory, without node:path. */
function resolveRelative(dir: string, target: string): string {
  const parts = dir ? dir.split("/") : [];
  for (const piece of target.split("/")) {
    if (piece === "" || piece === ".") continue;
    if (piece === "..") parts.pop();
    else parts.push(piece);
  }
  return parts.join("/");
}

export async function renderMarkdown({ source, dir, resolve }: RenderInput): Promise<RenderResult> {
  const shiki = await highlighter();
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let title = "";

  const marked = new Marked({ gfm: true }).use({
    renderer: {
      heading(token) {
        const html = this.parser.parseInline(token.tokens);
        const plain = this.parser.parseInline(token.tokens, this.parser.textRenderer);

        if (token.depth === 1) {
          title ||= plain;
          // The page title is rendered by the route, next to its section label and its summary.
          return "";
        }

        const base = slugify(plain) || `section-${headings.length + 1}`;
        const taken = seen.get(base) ?? 0;
        seen.set(base, taken + 1);
        const id = taken === 0 ? base : `${base}-${taken}`;

        if (token.depth === 2 || token.depth === 3) {
          headings.push({ id, text: plain, depth: token.depth });
        }

        return `<h${token.depth} id="${id}" class="doc-heading"><a class="doc-anchor" href="#${id}" aria-label="Link to this section">#</a>${html}</h${token.depth}>\n`;
      },

      code({ text, lang }) {
        if (lang === "mermaid") {
          // The source travels in the markup so a diagram still says something when the mermaid
          // bundle fails to load. The client component hides it once it has drawn the SVG.
          return `<figure class="doc-diagram" data-diagram><div class="doc-diagram-canvas"><pre class="doc-diagram-source">${escapeHtml(text)}</pre></div></figure>\n`;
        }

        const known = CODE_LANGUAGES.find((candidate) => candidate === lang);

        // Most blocks in these pages are formulas and pseudo-code with no language on the fence.
        // Guessing one paints keywords onto arithmetic, so an unlabelled block stays plain.
        const body = known
          ? shiki.codeToHtml(text, { lang: known, theme: "hearth" })
          : `<pre class="doc-plain"><code>${escapeHtml(text)}</code></pre>`;

        return `<figure class="doc-code" data-code>${body}</figure>\n`;
      },

      table(token) {
        let head = "";
        for (const cell of token.header) head += this.tablecell(cell);

        let body = "";
        for (const row of token.rows) {
          let cells = "";
          for (const cell of row) cells += this.tablecell(cell);
          body += this.tablerow({ text: cells });
        }

        return `<div class="doc-scroll"><table><thead>${this.tablerow({ text: head })}</thead><tbody>${body}</tbody></table></div>\n`;
      },

      link({ href, title: linkTitle, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");

        if (external) {
          return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="doc-link doc-link-out"${
            linkTitle ? ` title="${escapeHtml(linkTitle)}"` : ""
          }>${text}</a>`;
        }

        if (href.startsWith("#")) {
          return `<a href="${escapeHtml(href)}" class="doc-link">${text}</a>`;
        }

        const [path, fragment] = href.split("#");
        const route = resolve(resolveRelative(dir, path));

        // A link to a page we do not publish keeps its words and loses its underline, which is
        // better than sending a reader to a 404.
        if (!route) return `<span class="doc-link-dead">${text}</span>`;

        return `<a href="${escapeHtml(fragment ? `${route}#${fragment}` : route)}" class="doc-link">${text}</a>`;
      },
    },
  });

  const html = marked.parse(source) as string;
  return { title, html, headings };
}

/** An executed attack run: no markdown in it, so it is shown exactly as it was written. */
export function renderLog(source: string): string {
  return `<figure class="doc-code doc-log" data-code><pre><code>${escapeHtml(source)}</code></pre></figure>`;
}
