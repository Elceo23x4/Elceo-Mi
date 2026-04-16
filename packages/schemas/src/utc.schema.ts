<<<<<<< HEAD
export function toUtcIsoString(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid UTC date input');
  }
  return date.toISOString();
}
=======
export {};
>>>>>>> origin/main
