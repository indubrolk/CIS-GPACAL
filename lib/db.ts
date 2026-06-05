import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy initialization — avoids throwing at module-load time during `next build`
// when DATABASE_URL isn't available in the build environment.
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(process.env.DATABASE_URL, {
      fetchOptions: {
        cache: "no-store",
      },
    });
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Keep the named export for backward-compat, but as a getter
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
