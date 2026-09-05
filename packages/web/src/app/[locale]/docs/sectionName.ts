/**
 * The heading over a group of pages.
 *
 * A section is a folder name turned into a message key, so a folder the messages name reads in the
 * reader's language and a folder nobody has named yet reads as its own capitalised name. That is
 * what a new folder should do: appear, rather than print a key or disappear.
 */
export function sectionName(t: (key: string) => string, name: string): string {
  const translated = t(`sections.${name}`);
  if (translated && !translated.endsWith(`sections.${name}`)) return translated;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
