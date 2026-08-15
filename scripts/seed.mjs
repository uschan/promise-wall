import pg from "pg"

// Seeds the wall with the exact demo promises from the original Promise Wall.
//   DATABASE_URL="postgresql://..." node scripts/seed.mjs
// Idempotent: existing seed ids are skipped.

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("Set DATABASE_URL to your Supabase session-pooler connection string.")
  process.exit(1)
}

const P = (o) =>
  Object.assign(
    {
      type: "note",
      category: "Self-Growth",
      paper: "classic",
      attach: "pin",
      pinColor: 0x9a7b3f,
      w: 4.2,
      font: "hand",
      doodle: "none",
      status: "active",
    },
    o,
  )

const seeds = [
  P({ type: "photo", photo: "mountain", x: -17.6, y: 8.3, w: 4.8, rot: -2.5, author: "Noah", category: "Health", text: "Where I go to breathe.", body: "A photograph from the ridge trail. I promised myself I would come back every season." }),
  P({ text: "Be present in the moments that matter most.", x: -7.6, y: 8.7, w: 5.3, paper: "torn", font: "serif", doodle: "heart", rot: -1, author: "Amara", category: "Family", body: "Phones down at dinner. Eyes up when someone is talking. That is the whole promise." }),
  P({ text: "Make time for what makes my soul happy.", x: -0.7, y: 8.6, w: 4.2, paper: "pastelPink", attach: "tape", rot: 1.5, author: "Priya", category: "Self-Growth", doodle: "heart", body: "One hour a week that belongs only to me — no errands allowed." }),
  P({ text: "Drink water. Move my body. Clear my mind.", x: 5.9, y: 9.1, w: 4.5, paper: "kraft", rot: 2, author: "Leo", category: "Health", doodle: "none", pinColor: 0x8a6a33, body: "Three small things, every single morning, before the world gets loud." }),
  P({ text: "Learn something new every week.", x: 11.6, y: 5.5, w: 3.9, paper: "pastelPurple", rot: -1.5, author: "Dev", category: "Learning", doodle: "sprig", body: "It does not have to be useful. It only has to be new." }),
  P({ text: "Call my family more often.", x: 16.9, y: 7.0, w: 4.0, attach: "tape", rot: 1, author: "Sana", category: "Family", doodle: "sprig", body: "Sunday evenings. Even for five minutes. Especially for five minutes." }),
  P({ text: "I will choose kindness, every day.", x: -15.6, y: 3.3, w: 4.3, paper: "pastelPink", rot: -2, author: "Maya", category: "Kindness", doodle: "heart", body: "Starting with the version of it that no one sees." }),
  P({ text: "I promise to believe in myself a little more each day.", x: -8.5, y: 2.1, w: 5.1, paper: "notebook", rot: -0.5, author: "Tom", category: "Self-Growth", doodle: "heart", body: "Not all at once. Just a little more than yesterday." }),
  P({ text: "I will keep showing up for my dreams.", x: -1.1, y: 2.4, w: 5.7, paper: "torn", font: "serif", doodle: "star", rot: 0.5, author: "Jess", category: "Self-Growth", body: "I may not see the results today, but I trust that consistency will create the life I imagine." }),
  P({ text: "Read more books.", x: -16.3, y: -3.7, w: 3.6, paper: "graph", attach: "clip", rot: -1, author: "Ravi", category: "Learning", doodle: "heart", body: "Twenty pages before the first scroll of the day." }),
  P({ text: "Be proud of how far I've come.", x: -9.9, y: -4.5, w: 3.9, paper: "kraft", rot: -2.5, author: "Ana", category: "Self-Growth", pinColor: 0x7d7d85, body: "The distance behind me counts too." }),
  P({ text: "Leave things better than I found them.", x: -4.3, y: -4.9, w: 3.8, paper: "pastelGreen", attach: "tape", rot: 1.5, author: "Omar", category: "Kindness", body: "Rooms, conversations, people." }),
  P({ text: "Take a deep breath and trust the process.", x: 4.7, y: -3.5, w: 4.3, paper: "torn", rot: 2, author: "Mia", category: "Health", doodle: "sprig", body: "Panic has never once finished a project for me. Breathing has." }),
  P({ text: "I choose progress over perfection.", x: 10.9, y: -1.8, w: 4.1, paper: "kraft", rot: -3, author: "Kai", category: "Work", body: "Shipped and imperfect beats perfect and imaginary." }),
  P({ type: "photo", photo: "beach", x: 7.9, y: -7.7, w: 3.5, rot: 2.5, attach: "tape", author: "Mia", category: "Health", text: "Salt air resets me.", body: "Taken the morning I decided to slow down." }),
  P({ text: "Grateful for today.", x: 12.5, y: -7.2, w: 3.1, paper: "kraft", rot: 2, author: "Jon", category: "Kindness", doodle: "heart", body: "Even the ordinary ones. Especially the ordinary ones." }),
  P({ text: "I will protect my peace.", x: 21.5, y: 1.6, w: 4.0, rot: -1.5, author: "Zara", category: "Self-Growth", body: "Not every argument deserves my entrance." }),
  P({ text: "Say thank you more often.", x: -21.8, y: 6.5, w: 3.9, paper: "pastelPurple", rot: 2, author: "Ben", category: "Kindness", doodle: "arrow", body: "Out loud. In writing. In person." }),
  P({ text: "I will take care of my future self.", x: -21.9, y: -1.8, w: 4.1, paper: "pastelGreen", rot: -2, author: "Ines", category: "Health", body: "She is counting on the choices I make tonight." }),
  P({ text: "Be a reason someone smiles today.", x: 21.8, y: -5.4, w: 4.0, paper: "pastelPink", attach: "tape", rot: 1, author: "Tayo", category: "Kindness", body: "One person. Every day. That is enough." }),
]

const db = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

let inserted = 0
for (let i = 0; i < seeds.length; i++) {
  const s = seeds[i]
  const data = {
    text: s.text,
    body: s.body,
    author: s.author,
    category: s.category,
    paper: s.paper,
    x: s.x,
    y: s.y,
    w: s.w,
    rot: s.rot,
    attach: s.attach,
    font: s.font,
    pinColor: s.pinColor,
    doodle: s.doodle,
    photo: s.photo,
    status: s.status,
    createdAt: Date.now() - i * 3600000,
  }
  const res = await db.query(
    `insert into public.promises (id, user_id, data, created_at, updated_at)
     values ($1, null, $2::jsonb, now(), now())
     on conflict (id) do nothing`,
    [`seed-${i + 1}`, JSON.stringify(data)],
  )
  inserted += res.rowCount ?? 0
}

await db.end()
console.log(`seeded ${inserted} demo promises (${seeds.length} total, skipped ${seeds.length - inserted})`)
