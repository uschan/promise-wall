import pg from "pg"

// Usage:
//   DATABASE_URL="postgresql://..." node scripts/admin.mjs list
//   DATABASE_URL="postgresql://..." node scripts/admin.mjs admin <email>
// The connection string is your Supabase session-pooler URI (Settings → Database).

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("Set DATABASE_URL to your Supabase session-pooler connection string.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

const cmd = process.argv[2]

if (cmd === "list") {
  const { rows } = await client.query(
    `select u.id, u.email, p.name, p.is_admin, p.banned
     from auth.users u
     left join public.profiles p on p.id = u.id
     order by u.created_at desc`,
  )
  if (!rows.length) console.log("(no users)")
  for (const r of rows) {
    console.log(`${r.id}  ${r.email}  name=${r.name ?? "-"}  admin=${r.is_admin ?? false}  banned=${r.banned ?? false}`)
  }
} else if (cmd === "admin" && process.argv[3]) {
  const email = process.argv[3]
  // Ensure a profile row exists, then flag as admin.
  await client.query(
    `insert into public.profiles (id, name)
     select id, coalesce(raw_user_meta_data->>'name', '') from auth.users where email = $1
     on conflict (id) do nothing`,
    [email],
  )
  await client.query(
    `update public.profiles set is_admin = true
     where id = (select id from auth.users where email = $1)`,
    [email],
  )
  const { rows } = await client.query(
    `select id, email from auth.users where email = $1`,
    [email],
  )
  if (!rows.length) console.log(`no user with email ${email}`)
  else console.log(`set admin for ${email}`)
} else {
  console.log("usage: node scripts/admin.mjs list | admin <email>")
}

await client.end()
