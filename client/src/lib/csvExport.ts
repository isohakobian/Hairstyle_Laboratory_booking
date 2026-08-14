export type CsvRow = Record<string, string | number | null | undefined>;

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function createCsv(rows: CsvRow[]) {
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const lines = [headers.map(escapeCsvValue).join(',')];
  rows.forEach(row => lines.push(headers.map(header => escapeCsvValue(row[header])).join(',')));
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const url = URL.createObjectURL(new Blob([createCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
