export const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  dissolved: "Dissolved",
  historical: "Historical",
  unknown: "Unknown"
};

export function formatDate(value?: string | null): string {
  if (!value) return "Unknown";
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(value)) return value;

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
