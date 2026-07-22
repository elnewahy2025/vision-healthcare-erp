export type DbRow = Record<string, unknown>;

export function str(row: DbRow, key: string): string {
  return String(row[key] ?? '');
}

export function num(row: DbRow, key: string): number {
  return Number(row[key] ?? 0);
}

export function optStr(row: DbRow, key: string): string | undefined {
  const val = row[key];
  return val != null ? String(val) : undefined;
}

export function optNum(row: DbRow, key: string): number | undefined {
  const val = row[key];
  return val != null ? Number(val) : undefined;
}

export function jsonStr(row: DbRow, key: string): string | undefined {
  const val = row[key];
  if (val == null) return undefined;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}
