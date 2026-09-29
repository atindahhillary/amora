import postgres from "postgres";

declare global {
  var __amoraSql: postgres.Sql | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    max: 10,
    onnotice: () => {},
    transform: postgres.camel,
    // Transaction-mode poolers (Supabase on port 6543) don't support prepared statements.
    prepare: !url.includes(":6543/"),
  });
}

// Reuse one pool across hot reloads in development.
export const sql: postgres.Sql = globalThis.__amoraSql ?? (globalThis.__amoraSql = connect());
