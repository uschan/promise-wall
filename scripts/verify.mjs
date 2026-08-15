import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// End-to-end smoke test against a REAL signed-up user.
//   VERIFY_EMAIL="you@example.com" VERIFY_PASSWORD="..." node scripts/verify.mjs
// Exercises: sign-in → promise insert → reaction → save → reflection → report → settings read,
// then cleans up the test promise.

const env = {}
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const email = process.env.VERIFY_EMAIL
const password = process.env.VERIFY_PASSWORD
if (!email || !password) {
  console.error("Set VERIFY_EMAIL and VERIFY_PASSWORD to a real signed-up user's credentials.")
  process.exit(1)
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email, password })
if (siErr) {
  console.error("SIGNIN FAIL:", siErr.message)
  process.exit(1)
}
const uid = si.user.id
console.log("1. signin OK:", email)

const pid = `verify-${Date.now()}`
try {
  const ins = await sb.from("promises").insert({
    id: pid,
    user_id: uid,
    data: { text: "verify promise", author: "verify", paper: "classic", status: "active", createdAt: Date.now() },
    updated_at: new Date().toISOString(),
  })
  if (ins.error) throw new Error("INSERT FAIL: " + ins.error.message)
  console.log("2. promise insert OK")

  await sb.from("reactions").upsert(
    { promise_id: pid, user_id: uid, type: "heart" },
    { onConflict: "promise_id,user_id,type" },
  )
  await sb.from("reactions").delete().eq("promise_id", pid).eq("user_id", uid).eq("type", "heart")
  console.log("3. reaction OK")

  await sb.from("saves").upsert({ promise_id: pid, user_id: uid }, { onConflict: "promise_id,user_id" })
  await sb.from("saves").delete().eq("promise_id", pid).eq("user_id", uid)
  console.log("4. save OK")

  await sb.from("reflections").insert({ promise_id: pid, user_id: uid, author: "verify", text: "hello" })
  console.log("5. reflection OK")

  await sb.from("reports").insert({ promise_id: pid, user_id: uid, author: "verify", text: "spam" })
  console.log("6. report OK")

  const { data: srows } = await sb.from("settings").select("key, value")
  console.log("7. settings read OK, rows:", srows.length)

  console.log("\nALL BACKEND FLOWS PASSED ✅")
} finally {
  await sb.from("reports").delete().eq("promise_id", pid)
  await sb.from("promises").delete().eq("id", pid)
}
