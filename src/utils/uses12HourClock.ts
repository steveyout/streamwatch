export function uses12HourClock() {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).formatToParts(new Date());
  // If a dayPeriod ("AM"/"PM" or localized equivalent) appears, it's 12-hour
  return parts.some((p) => p.type === "dayPeriod");
}
