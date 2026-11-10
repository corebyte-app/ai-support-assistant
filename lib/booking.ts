export type DayHours = { open: string; close: string } | null;

// Single source of truth for opening hours (HH:mm, 24h). null = closed.
export const hours: Record<string, DayHours> = {
  monday: { open: "07:00", close: "15:00" },
  tuesday: { open: "07:00", close: "15:00" },
  wednesday: { open: "07:00", close: "15:00" },
  thursday: { open: "07:00", close: "15:00" },
  friday: { open: "07:00", close: "15:00" },
  saturday: { open: "08:00", close: "14:00" },
  sunday: null,
};

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const MAX_PARTY_SIZE = 8;
const FULLY_BOOKED_TIMES = ["12:00"]; // mock: lunch is always full

export function formatHours(dayHours: DayHours): string {
  return dayHours ? `${dayHours.open}-${dayHours.close}` : "Closed";
}

// Today's date in Auckland, e.g. { date: "2026-11-10", weekday: "tuesday" }
export function aucklandToday() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
  }).format(now);
  return { date, weekday: weekdayOf(date) };
}

// "2026-11-10" -> "tuesday". UTC avoids server time zone bugs.
export function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export type BookingRequest = {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  notes?: string;
};

export type BookingResult =
  | { ok: true; confirmationId: string; booking: BookingRequest }
  | { ok: false; problems: string[] };

export function checkBooking(b: BookingRequest): string[] {
  const problems: string[] = [];

  if (b.name.trim() === "") problems.push("Name is missing.");

  if (
    !Number.isInteger(b.partySize) ||
    b.partySize < 1 ||
    b.partySize > MAX_PARTY_SIZE
  ) {
    problems.push(
      `Party size must be a whole number from 1 to ${MAX_PARTY_SIZE}.`,
    );
  }

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(b.date);
  const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time);
  if (!dateOk) problems.push("Date must be YYYY-MM-DD.");
  if (!timeOk) problems.push("Time must be HH:mm (24h), for example 11:00.");

  if (dateOk && b.date < aucklandToday().date) {
    problems.push("That date is in the past.");
  }

  if (dateOk && timeOk) {
    const day = weekdayOf(b.date);
    const dayHours = hours[day];
    if (!dayHours) {
      problems.push(`The cafe is closed on ${day}s.`);
    } else if (b.time < dayHours.open || b.time >= dayHours.close) {
      // "HH:mm" strings compare correctly as text
      problems.push(`On ${day}s we are open ${formatHours(dayHours)}.`);
    } else if (FULLY_BOOKED_TIMES.includes(b.time)) {
      problems.push(`${b.time} is fully booked. Please choose another time.`);
    }
  }

  return problems;
}

export function makeConfirmationId(): string {
  return `HC-${Math.floor(1000 + Math.random() * 9000)}`;
}
