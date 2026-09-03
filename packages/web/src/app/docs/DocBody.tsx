"use client";

import { useEffect, useRef } from "react";

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
};

/**
 * Mermaid is two megabytes of layout engine for four diagrams, so it is fetched from the CDN on
 * the pages that actually have one rather than bundled into every route. The version is pinned.
 */
const MERMAID_VERSION = "11.15.0";

const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  darkMode: true,
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  themeVariables: {
    background: "#0a0a0a",
    primaryColor: "#17150f",
    primaryTextColor: "#eae6de",
    primaryBorderColor: "rgba(249,209,0,0.42)",
    secondaryColor: "#151515",
    tertiaryColor: "#101010",
    lineColor: "rgba(255,255,255,0.34)",
    textColor: "#bdb9b1",
    mainBkg: "#17150f",
    nodeBorder: "rgba(249,209,0,0.42)",
    clusterBkg: "#0d0d0d",
    clusterBorder: "rgba(255,255,255,0.1)",
    edgeLabelBackground: "#0a0a0a",
    actorBkg: "#17150f",
    actorBorder: "rgba(249,209,0,0.42)",
    actorTextColor: "#eae6de",
    actorLineColor: "rgba(255,255,255,0.2)",
    signalColor: "rgba(255,255,255,0.45)",
    signalTextColor: "#bdb9b1",
    labelBoxBkgColor: "#17150f",
    labelBoxBorderColor: "rgba(249,209,0,0.42)",
    labelTextColor: "#eae6de",
    loopTextColor: "#bdb9b1",
    noteBkgColor: "#1b1811",
    noteTextColor: "#eae6de",
    noteBorderColor: "rgba(249,209,0,0.35)",
    sequenceNumberColor: "#0e0e0e",
  },
};

function addCopyButtons(root: HTMLElement) {
  const blocks = root.querySelectorAll<HTMLElement>("[data-code]");

  for (const block of blocks) {
    if (block.querySelector(".doc-copy")) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "doc-copy";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy this block");

    button.addEventListener("click", () => {
      const text = block.querySelector("code")?.textContent ?? "";
      navigator.clipboard
        .writeText(text)
        .then(() => {
          button.textContent = "Copied";
          button.dataset.copied = "true";
          window.setTimeout(() => {
            button.textContent = "Copy";
            delete button.dataset.copied;
          }, 1600);
        })
        .catch(() => {
          button.textContent = "Press ctrl C";
        });
    });

    block.appendChild(button);
  }
}

async function drawDiagrams(root: HTMLElement, aborted: () => boolean) {
  const figures = [...root.querySelectorAll<HTMLElement>("[data-diagram]")];
  if (figures.length === 0) return;

  for (const figure of figures) figure.dataset.state = "pending";

  let mermaid: MermaidApi;
  try {
    const loaded = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */
      `https://cdnjs.cloudflare.com/ajax/libs/mermaid/${MERMAID_VERSION}/mermaid.esm.min.mjs`
    )) as { default: MermaidApi };
    mermaid = loaded.default;
    mermaid.initialize(MERMAID_CONFIG);
  } catch {
    for (const figure of figures) fail(figure, "The diagram renderer did not load. The source is below.");
    return;
  }

  for (const [index, figure] of figures.entries()) {
    if (aborted()) return;

    const canvas = figure.querySelector<HTMLElement>(".doc-diagram-canvas");
    const source = figure.querySelector(".doc-diagram-source")?.textContent ?? "";
    if (!canvas) continue;

    try {
      const { svg } = await mermaid.render(`doc-diagram-${index}`, source);
      if (aborted()) return;

      const holder = document.createElement("div");
      holder.innerHTML = svg;
      const drawn = holder.querySelector("svg");
      if (drawn) {
        size(drawn);
        canvas.insertBefore(drawn, canvas.firstChild);
      }
      figure.dataset.state = "done";
      hint(figure, canvas);
    } catch {
      fail(figure, "This diagram did not draw. The source is below.");
    }
  }
}

/**
 * Mermaid asks for the full column and lets the browser scale the drawing down to fit. Below about
 * three quarters the labels stop being readable, so the diagram keeps that size and scrolls.
 */
const SMALLEST_READABLE = 0.74;

function size(svg: SVGSVGElement) {
  const natural = svg.viewBox.baseVal?.width ?? 0;
  if (natural <= 0) return;

  svg.style.maxWidth = `${Math.round(natural)}px`;
  svg.style.minWidth = `${Math.round(natural * SMALLEST_READABLE)}px`;
}

function hint(figure: HTMLElement, canvas: HTMLElement) {
  if (canvas.scrollWidth <= canvas.clientWidth + 1) return;
  if (figure.querySelector(".doc-diagram-hint")) return;

  const line = document.createElement("p");
  line.className = "doc-diagram-hint";
  line.textContent = "Wider than the column. Scroll it sideways.";
  figure.appendChild(line);
}

function fail(figure: HTMLElement, message: string) {
  figure.dataset.state = "failed";
  if (figure.querySelector(".doc-diagram-note")) return;

  const note = document.createElement("p");
  note.className = "doc-diagram-note";
  note.textContent = message;
  figure.insertBefore(note, figure.firstChild);
}

/**
 * The prose comes out of the markdown renderer as a string, so the two pieces of behaviour it
 * needs are attached to the finished DOM instead of being expressed as components.
 */
export function DocBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let cancelled = false;
    addCopyButtons(root);
    void drawDiagrams(root, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [html]);

  return <div ref={ref} className="doc-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
