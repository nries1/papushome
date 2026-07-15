// Shared by both the classic scheduler flow (bookClass.ts) and the Explore
// listing flow (exploreBooking.ts) — both reduce a page to a flat list of
// candidate entries with some free-text blob describing the class, then need
// the same "which one did they mean" logic on top.

export interface ClassEntry {
  ancestorText: string
}

function buildTimeRegex(preferredTime: string): RegExp | null {
  const m = preferredTime.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)/i)
  if (!m) return null
  // No leading \b: the classic scheduler's card text has real whitespace
  // between fields, but the Explore listing's does not (e.g. instructor name
  // runs straight into the start time — "...Allen12:30pm EDT..."), so a
  // digit can be directly preceded by a letter with no word boundary between
  // them. \b would silently never match there.
  return new RegExp(`${m[1]}(?::\\d{2})?\\s*${m[2]}\\b`, 'i')
}

// Prefers a class matching both the requested name and time. Failing that,
// if a time was given, falls back to whatever class is actually at that time
// regardless of name — a class-name guess can be wrong in ways a specific
// time normally isn't (e.g. asking for "Tabata" at 12:30pm when the studio's
// real listing for that slot is "HITT Xpress" — a plain name-only match would
// wrongly grab an unrelated "Ultimate Tabata" class hours away instead).
export function selectClassEntry<T extends ClassEntry>(
  entries: T[],
  className: string,
  preferredTime?: string
): T {
  const nameRe = new RegExp(className, 'i')
  const timeRe = preferredTime ? buildTimeRegex(preferredTime) : null

  const nameAndTime = entries.filter(
    (e) =>
      nameRe.test(e.ancestorText) && (!timeRe || timeRe.test(e.ancestorText))
  )
  if (nameAndTime.length) return nameAndTime[0]

  if (timeRe) {
    const byTimeOnly = entries.filter((e) => timeRe.test(e.ancestorText))
    if (byTimeOnly.length) return byTimeOnly[0]
  }

  const available = entries
    .map((e) => e.ancestorText.trim().slice(0, 60))
    .join('\n')
  throw new Error(
    `ERROR: No class matching "${className}"${preferredTime ? ` at ${preferredTime}` : ''}. Available:\n${available}`
  )
}
