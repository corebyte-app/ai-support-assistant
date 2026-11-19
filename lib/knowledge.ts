import { embed } from "ai";
import { sql } from "@/lib/db";

export type KnowledgeHit = {
  title: string;
  content: string;
  similarity: number;
};

export type KnowledgeResult =
  | { found: true; results: { title: string; content: string }[] }
  | { found: false };

export async function searchKnowledge(query: string): Promise<KnowledgeHit[]> {
  // Same model as the seed script, so the numbers are comparable
  const { embedding } = await embed({
    model: "voyage/voyage-4-lite",
    value: query,
  });

  const rows = await sql<{ content: string; similarity: number }[]>`
    select content,
           1 - (embedding <=> ${JSON.stringify(embedding)}::extensions.vector) as similarity
    from documents
    order by embedding <=> ${JSON.stringify(embedding)}::extensions.vector
    limit 3
  `;

  const best = rows[0]?.similarity ?? 0;

  // Floor 0.35: below this nothing is really related (dogs' 2nd/3rd were ~0.29).
  // Within 0.05 of the best: keeps close ties (oat milk 0.41 + 0.37), drops
  // clearly weaker sections (wifi 0.48 vs 0.57). Tested 20 Nov.
  return rows
    .filter((r) => r.similarity >= 0.35 && best - r.similarity <= 0.05)
    .map((r) => ({
      title: r.content.split("\n")[0].replace(/^## /, ""),
      content: r.content,
      similarity: r.similarity,
    }));
}
