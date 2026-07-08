import { bookMindbodyClass } from '../bookClass';

const Y7_STUDIO_ID = '140321';

export async function bookYogaClass(
  date: string,
  className: string,
  preferredTime?: string
): Promise<string> {
  return bookMindbodyClass(Y7_STUDIO_ID, date, className, preferredTime);
}
