import { bookMindbodyClass } from '../bookClass';

const TABATA_STUDIO_ID = '275991';

export async function bookTabataClass(
  date: string,
  className: string,
  preferredTime?: string
): Promise<string> {
  return bookMindbodyClass(TABATA_STUDIO_ID, date, className, preferredTime);
}
