const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toUtcMidnight = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

export const parseDateOnly = (value) => {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) return null;

  const [y, m, d] = value.split("-").map(Number);
  const parsed = toUtcMidnight(y, m, d);

  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return null;
  }

  return parsed;
};

export const getTodayDateOnly = () => {
  const now = new Date();
  return toUtcMidnight(now.getFullYear(), now.getMonth() + 1, now.getDate());
};
