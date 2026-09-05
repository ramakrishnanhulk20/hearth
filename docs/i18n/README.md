# Translating the documentation

Every page under `docs/` can be translated by copying it to `docs/i18n/<locale>/<same path>.md` and translating the prose. `<locale>` is one of the fifteen non-English codes in `packages/web/src/i18n/routing.ts`: `zh`, `zh-tw`, `ja`, `ko`, `vi`, `hi`, `ta`, `ru`, `fr`, `es`, `pt`, `de`, `id`, `tr`, `ar`. So the Japanese version of `docs/concepts/why-zama.md` is `docs/i18n/ja/concepts/why-zama.md`.

Keep the relative links, the heading levels and the code blocks exactly as they are: the site turns headings into the page outline and rewrites the links to real routes, and a changed heading silently drops a row from that outline. Translate the prose, the table headers and the image alt text. Leave contract names, function names, addresses, tickers and numbers alone.

A page you have not translated yet is not a gap. The site renders the English file in its place with one line at the top saying so, so a language can ship half done and grow.

`docs/i18n/<locale>/README.md` is optional. If it is there, copy the `## Pages` table across and translate the link text and the second column: the link text becomes the page title in the sidebar and the second column becomes its summary. Leave the link targets pointing at the English filenames, because that is what the site matches on.

The attack logs under `docs/security/attacks/` are never translated. They are the raw output of scripts we ran, and rewording them would be inventing evidence.
