import { tool } from "ai";
import z from "zod";
import {
  type BookingResult,
  checkBooking,
  formatHours,
  hours,
  makeConfirmationId,
} from "./booking";
import { searchKnowledge, type KnowledgeResult } from "./knowledge";
import { saveHandoff, type HandoffResult } from "./handoff";

export const cafeTools = {
  getOpeningHours: tool({
    description: "Get Harbour Cafe's opening hours for a day of the week",
    inputSchema: z.object({
      day: z.string().describe("Day of the week, e.g. monday"),
    }),
    execute: async ({ day }) => {
      const key = day.toLowerCase();
      return {
        day,
        hours: key in hours ? formatHours(hours[key]) : "Unknown day",
      };
    },
  }),
  searchKnowledge: tool({
    description:
      "Search Harbour Cafe's info: menu, drinks, dietary options, kids, dogs, parking, payment, Wi-Fi, groups.",
    inputSchema: z.object({
      query: z.string().describe("The guest's question in short words"),
    }),
    execute: async ({ query }): Promise<KnowledgeResult> => {
      const results = await searchKnowledge(query);
      return results.length
        ? {
            found: true,
            results: results.map(({ title, content }) => ({
              title,
              content,
            })),
          }
        : { found: false };
    },
  }),
  requestHandoff: tool({
    description:
      "Pass the guest's question to Harbour Cafe staff, who will contact them. Only call after the guest agrees and gives name and contact.",
    inputSchema: z.object({
      name: z.string().describe("Guest name exactly as given"),
      contact: z
        .string()
        .describe("Guest contact, e.g. phone or email exactly as given"),
      question: z.string().describe("short summary of what they need"),
    }),
    execute: async ({ name, contact, question }): Promise<HandoffResult> => {
      return saveHandoff({ name, contact, question });
    },
  }),
  createBooking: tool({
    description:
      "Book a table at Harbour Cafe.  Only call this when name, date, time and party size are all known.",
    inputSchema: z.object({
      name: z.string().describe("Guest name exactly as given"),
      date: z.string().describe("Booking date as YYYY-MM-DD"),
      time: z.string().describe("Booking time as 24h HH:mm, e.g. 11:00"),
      partySize: z.number().describe("Number of guests"),
      notes: z.string().optional().describe("Extra requests, e.g. high chair"),
    }),
    execute: async (booking): Promise<BookingResult> => {
      const problems = checkBooking(booking);
      if (problems.length > 0) {
        return {
          ok: false,
          problems: problems,
        };
      }
      // No database yet. Later this is where we save to Postgres.
      return { ok: true, confirmationId: makeConfirmationId(), booking };
    },
  }),
};
