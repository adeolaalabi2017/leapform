/** Minimal CSV writing (RFC 4180-ish). */
export function csvCell(value: unknown): string {
  let s = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
