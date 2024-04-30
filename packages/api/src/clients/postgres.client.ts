import postgres from 'postgres';

export function getPostgresInstance(url: string) {
  const sql = postgres(url);
  return sql;
}
