import { readFile } from "node:fs/promises";
import { embedMany } from "ai";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
const file = "docs/knowledge/harbour-cafe.md";
const text = await readFile(file, "utf8");

// One chunk per "## " section. Keep the heading so each chunk makes sense alone.
const chunks = text
  .split(/^## /m)
  .slice(1)
  .map((part) => "## " + part.trim());

const { embeddings, usage } = await embedMany({
  model: "voyage/voyage-4-lite", // through your AI Gateway key
  values: chunks,
});

// Re-running is safe: remove the old chunks for this file first.
await sql`delete from documents where source = ${file}`;
for (const [i, content] of chunks.entries()) {
  await sql`
    insert into documents (source, content, embedding)
    values (${file}, ${content}, ${JSON.stringify(embeddings[i])}::extensions.vector)
  `;
}

console.log(`Saved ${chunks.length} chunks (${usage.tokens} tokens)`);
await sql.end();
