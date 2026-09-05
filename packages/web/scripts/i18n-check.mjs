#!/usr/bin/env node
/**
 * Checks every translation file against English.
 *
 * A translator sends back one file at a time, and the two mistakes that matter are a key that is
 * missing (the page silently falls back to English and nobody notices for a month) and a key whose
 * ICU braces were reflowed by a translation tool (the page throws at render). Both are caught here
 * before the file is committed, and the exit code is what a CI step reads.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const messages = join(root, "messages");
const routing = readFileSync(join(root, "src", "i18n", "routing.ts"), "utf8");

/** The locale list lives in one place: the routing file the app itself uses. */
const KNOWN = [...routing.matchAll(/\{ code: "([^"]+)"/g)].map((match) => match[1]);
const DEFAULT_LOCALE = "en";

function flatten(value, prefix = "", out = new Map()) {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry !== null && typeof entry === "object") flatten(entry, path, out);
    else out.set(path, entry);
  }
  return out;
}

/**
 * A small ICU reader: enough to catch an unbalanced brace, an empty placeholder and a plural whose
 * `other` arm was dropped. It does not try to be the formatter, only to refuse a file that would
 * throw once a page rendered it.
 */
function icuProblem(text) {
  if (typeof text !== "string") return "not a string";

  let depth = 0;
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (char === "'" && (text[at + 1] === "{" || text[at + 1] === "}")) {
      at += 1;
      continue;
    }
    if (char === "{") {
      depth += 1;
      const close = text.indexOf("}", at);
      const name = text.slice(at + 1, close < 0 ? text.length : close).trim();
      if (name === "") return "an empty {} placeholder";
    } else if (char === "}") {
      depth -= 1;
      if (depth < 0) return "a } with no { before it";
    }
  }
  if (depth !== 0) return "an unclosed {";

  for (const kind of ["plural", "select", "selectordinal"]) {
    if (new RegExp(`,\\s*${kind}\\s*,`).test(text) && !/\bother\s*\{/.test(text)) {
      return `a ${kind} with no "other" arm`;
    }
  }

  // ICU writes `#` in whatever numbering system the language defaults to, and Arabic's default
  // has moved between releases of the underlying locale data. Every figure on these screens is
  // money or a count a wallet will show back in Western digits, so the app formats the number
  // itself and hands it in as {shown}. A `#` here would quietly undo that on one language.
  if (/,\s*(plural|selectordinal)\s*,/.test(text) && text.includes("#")) {
    return "a # inside a plural. Print the figure as {shown} instead, which the app formats";
  }

  return null;
}

function read(file) {
  const raw = readFileSync(file, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) throw new Error("starts with a byte-order mark");
  return JSON.parse(raw);
}

const problems = [];

if (!existsSync(join(messages, "en.json"))) {
  console.error("messages/en.json is missing, so there is nothing to check against.");
  process.exit(1);
}

const english = flatten(read(join(messages, "en.json")));

for (const [key, text] of english) {
  const problem = icuProblem(text);
  if (problem) problems.push(`en  ${key}: ${problem}`);
}

const files = readdirSync(messages)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""))
  .sort();

for (const locale of files) {
  if (!KNOWN.includes(locale)) {
    problems.push(`${locale}  is not one of the ${KNOWN.length} locales in src/i18n/routing.ts`);
    continue;
  }
  if (locale === DEFAULT_LOCALE) continue;

  let tree;
  try {
    tree = flatten(read(join(messages, `${locale}.json`)));
  } catch (error) {
    problems.push(`${locale}  will not parse: ${error.message}`);
    continue;
  }

  for (const key of english.keys()) {
    if (!tree.has(key)) problems.push(`${locale}  missing: ${key}`);
  }
  for (const [key, text] of tree) {
    if (!english.has(key)) {
      problems.push(`${locale}  extra: ${key}`);
      continue;
    }
    const problem = icuProblem(text);
    if (problem) problems.push(`${locale}  ${key}: ${problem}`);
  }
}

const missing = KNOWN.filter((locale) => !files.includes(locale));

if (problems.length > 0) {
  for (const line of problems) console.error(line);
  console.error(`\n${problems.length} problems across ${files.length} files.`);
  process.exit(1);
}

console.log(`${english.size} keys in en.json.`);
console.log(`${files.length} of ${KNOWN.length} locale files present and clean: ${files.join(", ")}.`);
if (missing.length > 0) console.log(`Not translated yet, so they read in English: ${missing.join(", ")}.`);
