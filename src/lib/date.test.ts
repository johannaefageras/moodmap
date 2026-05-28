import { describe, expect, test } from "vitest";
import {
	addDays,
	daysAgoISO,
	isoDate,
	lastNDays,
	todayISO,
	weekdayOf,
	zonedHour,
} from "./date";

describe("isoDate (Stockholm calendar day of an instant)", () => {
	test("midday UTC stays the same calendar day", () => {
		expect(isoDate(new Date("2025-01-15T12:00:00Z"))).toBe("2025-01-15");
	});

	// The core bug: 23:30 UTC in winter is already 00:30 the next day in Stockholm (UTC+1).
	test("late-night UTC rolls over to the next Stockholm day in winter (UTC+1)", () => {
		expect(isoDate(new Date("2025-01-15T23:30:00Z"))).toBe("2025-01-16");
	});

	// DST: in summer Stockholm is UTC+2, so 22:30 UTC is already 00:30 the next day.
	test("late-night UTC rolls over to the next Stockholm day in summer (UTC+2)", () => {
		expect(isoDate(new Date("2025-07-15T22:30:00Z"))).toBe("2025-07-16");
	});

	test("just before Stockholm midnight stays the current day", () => {
		// 22:30 UTC in winter = 23:30 Stockholm, still the 15th.
		expect(isoDate(new Date("2025-01-15T22:30:00Z"))).toBe("2025-01-15");
	});
});

describe("addDays (pure calendar arithmetic on YYYY-MM-DD)", () => {
	test("subtracts across a month boundary", () => {
		expect(addDays("2025-01-01", -1)).toBe("2024-12-31");
	});

	test("adds across a month boundary", () => {
		expect(addDays("2025-01-31", 1)).toBe("2025-02-01");
	});

	// EU DST starts 2025-03-30; calendar arithmetic must not lose or gain a day.
	test("crosses the spring DST boundary cleanly", () => {
		expect(addDays("2025-03-29", 1)).toBe("2025-03-30");
		expect(addDays("2025-03-30", 1)).toBe("2025-03-31");
	});
});

describe("daysAgoISO", () => {
	test("counts back from today (Stockholm)", () => {
		const now = new Date("2025-01-16T00:30:00Z"); // 01:30 Stockholm on the 16th
		expect(daysAgoISO(0, now)).toBe("2025-01-16");
		expect(daysAgoISO(6, now)).toBe("2025-01-10");
	});
});

describe("lastNDays", () => {
	test("returns an ascending range ending today", () => {
		const now = new Date("2025-01-16T12:00:00Z");
		expect(lastNDays(7, now)).toEqual([
			"2025-01-10",
			"2025-01-11",
			"2025-01-12",
			"2025-01-13",
			"2025-01-14",
			"2025-01-15",
			"2025-01-16",
		]);
	});
});

describe("zonedHour (Stockholm hour of day)", () => {
	test("reflects the Stockholm offset, not UTC", () => {
		expect(zonedHour(new Date("2025-01-15T23:30:00Z"))).toBe(0); // 00:30 Stockholm
		expect(zonedHour(new Date("2025-07-15T22:30:00Z"))).toBe(0); // 00:30 Stockholm (DST)
		expect(zonedHour(new Date("2025-01-15T12:00:00Z"))).toBe(13);
	});
});

describe("weekdayOf", () => {
	test("returns 0=Sunday..6=Saturday for a calendar date", () => {
		expect(weekdayOf("2025-01-16")).toBe(4); // Thursday
		expect(weekdayOf("2025-01-19")).toBe(0); // Sunday
	});
});

describe("todayISO", () => {
	test("is isoDate of now", () => {
		const now = new Date("2025-01-15T23:30:00Z");
		expect(todayISO(now)).toBe(isoDate(now));
	});
});
