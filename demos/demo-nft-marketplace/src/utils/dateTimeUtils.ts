import { format, isAfter, isBefore, isPast, set, subDays } from 'date-fns';

export const DATE_FORMAT = 'MM/dd/yyyy';
export const TIME_FORMAT = 'HH:mm aa';
export const DATE_TIME_FORMAT = 'MM/dd/yyyy, HH:mm aa';

export function formatDate(date?: Date, dateFormat = DATE_TIME_FORMAT) {
  return date ? format(date, dateFormat) : '';
}

export function toDate(value: string | Date) {
  return new Date(value);
}

const now = () => new Date();

export default {
  now,
  isPast,
  subDays,
  isAfter,
  isBefore,
  set,
};
