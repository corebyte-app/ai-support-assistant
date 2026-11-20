import { sql } from "@/lib/db";

export type HandoffResult =
  | { ok: true; ticketId: string }
  | { ok: false; problem: string };

export async function saveHandoff(h: {
  name: string;
  contact: string;
  question: string;
}): Promise<HandoffResult> {
  if (!h.name.trim() || !h.contact.trim() || !h.question.trim()) {
    return {
      ok: false,
      problem: "Please give your name and a phone number or email.",
    };
  }

  const [row] = await sql`
        INSERT INTO handoffs (name, contact, question)
        VALUES (${h.name}, ${h.contact}, ${h.question})
        RETURNING id
    `;

  return { ok: true, ticketId: `HC-Q${row.id}` };
}
