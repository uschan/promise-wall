import pg from "pg"

// Reload PostgREST's schema cache after applying migrations over a direct
// connection (supabase db push does not trigger this automatically).
//   DATABASE_URL="postgresql://..." node scripts/reload.mjs

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("Set DATABASE_URL to your Supabase session-pooler connection string.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query("notify pgrst, 'reload schema'")
await client.end()
console.log("PostgREST schema cache reloaded")
