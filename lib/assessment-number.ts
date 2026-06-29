export function generateAssessmentNumber(date = new Date(), random = Math.random) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((item) => item.type === type)?.value ?? "";
  const localDate = `${part("year")}${part("month")}${part("day")}`;
  const suffix = Math.min(9999, Math.max(0, Math.floor(random() * 10000)))
    .toString()
    .padStart(4, "0");

  return `11399-${localDate}-${suffix}`;
}
