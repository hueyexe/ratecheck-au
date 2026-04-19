export function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv<T extends object>(rows: T[], headers: Array<keyof T>): string {
  const headerLine = headers.map((h) => escapeCsvCell(String(h))).join(",");
  const lines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));
  return [headerLine, ...lines].join("\n");
}
