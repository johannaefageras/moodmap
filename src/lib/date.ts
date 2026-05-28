// Single source of truth for "what day is it" in the app.
//
// moodmap is a Swedish app, so a "day" rolls over at Stockholm midnight — not
// UTC. Computing dates with new Date().toISOString() (UTC) mis-attributes
// check-ins logged after local midnight to the previous day. Every date the
// server reasons about — both the logged_for written on inserts and the ranges
// read back — must go through these helpers so they all agree.

const TIME_ZONE = "Europe/Stockholm";

// en-CA renders dates as YYYY-MM-DD, which is exactly the ISO format we store.
const isoFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	hour: "2-digit",
	hour12: false,
});

// YYYY-MM-DD for the Stockholm calendar day containing `instant`.
export function isoDate(instant: Date = new Date()): string {
	return isoFormatter.format(instant);
}

// Today's date in Stockholm, YYYY-MM-DD.
export function todayISO(now: Date = new Date()): string {
	return isoDate(now);
}

// Add (or subtract) whole calendar days to a YYYY-MM-DD string. Pure calendar
// arithmetic anchored at UTC midnight, so it never touches clock time and is
// unaffected by DST transitions.
export function addDays(isoDay: string, delta: number): string {
	const [y, m, d] = isoDay.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + delta);
	return dt.toISOString().slice(0, 10);
}

// `n` days before today (Stockholm), YYYY-MM-DD.
export function daysAgoISO(n: number, now: Date = new Date()): string {
	return addDays(todayISO(now), -n);
}

// Ascending list of the last `count` Stockholm days, ending today.
export function lastNDays(count: number, now: Date = new Date()): string[] {
	const today = todayISO(now);
	const out: string[] = [];
	for (let i = count - 1; i >= 0; i--) out.push(addDays(today, -i));
	return out;
}

// Hour of day (0–23) in Stockholm, for time-of-day greetings.
export function zonedHour(now: Date = new Date()): number {
	// hour12:false yields "00".."23"; some engines emit "24" at midnight.
	const h = Number(hourFormatter.format(now));
	return h === 24 ? 0 : h;
}

// Day-of-week index (0=Sunday..6=Saturday) for a YYYY-MM-DD string.
export function weekdayOf(isoDay: string): number {
	const [y, m, d] = isoDay.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
