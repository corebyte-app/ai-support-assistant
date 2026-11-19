import postgres from "postgres";

// prepare: false is needed for Supabase's Transaction pooler (used on Vercel)
export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 1,
  prepare: false,
});
