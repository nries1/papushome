import { bookMindbodyClass } from '../bookClass'

const TABATA_STUDIO_ID = '275991'

// The classic scheduler for TABATA_STUDIO_ID shows an empty schedule every
// day (confirmed live) — real classes only appear on MindBody's newer
// consumer Explore listing for this studio. Used as a fallback when the
// classic flow finds nothing.
const TABATA_EXPLORE_URL =
  'https://www.mindbodyonline.com/explore/locations/mike-montanez-tabata-ultimate-fitness-prospect-heights'

export async function bookTabataClass(
  date: string,
  className: string,
  preferredTime?: string
): Promise<string> {
  return bookMindbodyClass(TABATA_STUDIO_ID, date, className, preferredTime, TABATA_EXPLORE_URL)
}
