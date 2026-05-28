import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "./supabase/server";

type EntryRow = {
	id: string;
	created_at: string;
	logged_for: string;
	mood: number | null;
	energy: number | null;
	concentration: number | null;
	anxiety: number | null;
	stress: number | null;
	sleep_hours: number | null;
	sleep_quality: number | null;
	water_glasses: number | null;
	exercise_min: number | null;
	daylight_min: number | null;
	showered: boolean | null;
	brushed_teeth: boolean | null;
	dressed: boolean | null;
	ate_meals: boolean | null;
	social_relation: string | null;
	social_note: string | null;
	caffeine: number | null;
	alcohol: number | null;
	nicotine: number | null;
	drugs: number | null;
	note: string | null;
};

function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function todayISO(): string {
	return isoDate(new Date());
}

function daysAgoISO(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return isoDate(d);
}

function avg(values: (number | null | undefined)[]): number | null {
	const xs = values.filter((v): v is number => typeof v === "number");
	if (xs.length === 0) return null;
	return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sum(values: (number | null | undefined)[]): number {
	return values.reduce<number>(
		(a, b) => a + (typeof b === "number" ? b : 0),
		0,
	);
}

function fmtNum(n: number): string {
	return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

const SOCIAL_LABEL: Record<string, string> = {
	family: "familj",
	friend: "vän",
	partner: "partner",
	colleague: "kollega",
	neighbor: "granne",
	pet: "husdjur",
	care: "vårdkontakt",
	online: "online",
	stranger: "annan",
};

function describeEntry(r: EntryRow): string {
	const parts: string[] = [];
	if (r.mood !== null) parts.push(`Humör ${fmtNum(r.mood)}/10`);
	if (r.energy !== null) parts.push(`Energi ${fmtNum(r.energy)}/10`);
	if (r.concentration !== null)
		parts.push(`Koncentration ${fmtNum(r.concentration)}/10`);
	if (r.anxiety !== null) parts.push(`Ångest ${fmtNum(r.anxiety)}/10`);
	if (r.stress !== null) parts.push(`Stress ${fmtNum(r.stress)}/10`);
	if (r.sleep_hours !== null) parts.push(`Sömn ${fmtNum(r.sleep_hours)} h`);
	else if (r.sleep_quality !== null)
		parts.push(`Sömnkvalitet ${fmtNum(r.sleep_quality)}/10`);
	if (r.water_glasses) parts.push(`Vatten +${fmtNum(r.water_glasses)} glas`);
	if (r.exercise_min) parts.push(`Träning +${fmtNum(r.exercise_min)} min`);
	if (r.daylight_min) parts.push(`Dagsljus +${fmtNum(r.daylight_min)} min`);
	if (r.caffeine) parts.push(`Koffein +${fmtNum(r.caffeine)}`);
	if (r.alcohol) parts.push(`Alkohol +${fmtNum(r.alcohol)}`);
	if (r.nicotine) parts.push(`Nikotin +${fmtNum(r.nicotine)}`);
	if (r.drugs) parts.push(`Droger +${fmtNum(r.drugs)}`);
	if (r.showered) parts.push("Duschat");
	if (r.brushed_teeth) parts.push("Borstat tänderna");
	if (r.dressed) parts.push("Påklädd");
	if (r.ate_meals) parts.push("Ätit");
	if (r.social_relation)
		parts.push(
			`Socialt · ${SOCIAL_LABEL[r.social_relation] ?? r.social_relation}`,
		);
	if (r.social_note) parts.push(`Socialt · ${r.social_note}`);
	return parts.join(" · ");
}

function latestNumber(rows: EntryRow[], key: keyof EntryRow): number | null {
	const sorted = [...rows].sort((a, b) =>
		a.created_at < b.created_at ? 1 : -1,
	);
	for (const r of sorted) {
		const v = r[key];
		if (typeof v === "number") return v;
	}
	return null;
}

export type DashboardSeries = {
	mood: number[];
	energy: number[];
	concentration: number[];
	anxiety: number[];
	stress: number[];
	sleepHours: number[];
	sleepQuality: number[];
	water: number[];
	exercise: number[];
	daylight: number[];
	social: number[];
	caffeine: number[];
	alcohol: number[];
	nicotine: number[];
	drugs: number[];
	showered: boolean[];
	brushed_teeth: boolean[];
	dressed: boolean[];
	ate_meals: boolean[];
};

export type DashboardSummary = {
	displayName: string;
	partOfDay: "morgon" | "dag" | "kväll" | "natt";
	todayLabel: string;
	loggedDaysLast30: number;
	stats: {
		moodAvg7d: number | null;
		sleepHoursAvg7d: number | null;
		waterToday: number;
		checkinsLast30: number;
	};
	today: {
		mood: number | null;
		energy: number | null;
		concentration: number | null;
		anxiety: number | null;
		stress: number | null;
		sleepHours: number | null;
		sleepQuality: number | null;
		water: number;
		exercise: number;
		daylight: number;
		showered: boolean;
		brushed_teeth: boolean;
		dressed: boolean;
		ate_meals: boolean;
		social: number;
		caffeine: number;
		alcohol: number;
		nicotine: number;
		drugs: number;
	};
	avg7d: {
		mood: number | null;
		energy: number | null;
		concentration: number | null;
		anxiety: number | null;
		stress: number | null;
		sleepHours: number | null;
		sleepQuality: number | null;
		waterPerDay: number | null;
		exercisePerDay: number | null;
		daylightPerDay: number | null;
		socialPerDay: number | null;
		caffeinePerDay: number | null;
		alcoholPerDay: number | null;
		nicotinePerDay: number | null;
		drugsPerDay: number | null;
	};
	recent: {
		id: string;
		loggedFor: string;
		note: string | null;
		summary: string;
	}[];
	series30d: DashboardSeries;
};

const WEEKDAY_SV = [
	"Söndag",
	"Måndag",
	"Tisdag",
	"Onsdag",
	"Torsdag",
	"Fredag",
	"Lördag",
];
const MONTH_SV = [
	"januari",
	"februari",
	"mars",
	"april",
	"maj",
	"juni",
	"juli",
	"augusti",
	"september",
	"oktober",
	"november",
	"december",
];

function formatTodayLabel(d: Date): string {
	return `${WEEKDAY_SV[d.getDay()]} ${d.getDate()} ${MONTH_SV[d.getMonth()]}`;
}

function partOfDay(d: Date): "morgon" | "dag" | "kväll" | "natt" {
	const h = d.getHours();
	if (h < 5) return "natt";
	if (h < 11) return "morgon";
	if (h < 17) return "dag";
	if (h < 23) return "kväll";
	return "natt";
}

export const getDashboardSummary = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardSummary> => {
		const supabase = createSupabaseServerClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();
		if (userError || !user) throw new Error("Inte inloggad");

		const today = todayISO();
		const start30 = daysAgoISO(29);

		const { data: rows, error } = await supabase
			.from("entries")
			.select(
				"id, created_at, logged_for, mood, energy, concentration, anxiety, stress, sleep_hours, sleep_quality, water_glasses, exercise_min, daylight_min, showered, brushed_teeth, dressed, ate_meals, social_relation, social_note, caffeine, alcohol, nicotine, drugs, note",
			)
			.eq("user_id", user.id)
			.gte("logged_for", start30)
			.lte("logged_for", today)
			.order("created_at", { ascending: false });

		if (error) throw new Error(error.message);
		const all = (rows as EntryRow[]) ?? [];

		const start7 = daysAgoISO(6);
		const last7 = all.filter((r) => r.logged_for >= start7);
		const todays = all.filter((r) => r.logged_for === today);

		const dayKeys: string[] = [];
		for (let i = 29; i >= 0; i--) dayKeys.push(daysAgoISO(i));
		const byDay = new Map<string, EntryRow[]>();
		for (const r of all) {
			const list = byDay.get(r.logged_for) ?? [];
			list.push(r);
			byDay.set(r.logged_for, list);
		}
		const seriesAvg = (key: keyof EntryRow): number[] => {
			let last = 0;
			return dayKeys.map((d) => {
				const rs = byDay.get(d) ?? [];
				const v = avg(rs.map((r) => r[key] as number | null | undefined));
				if (v !== null) last = v;
				return Number(last.toFixed(2));
			});
		};
		const seriesSum = (key: keyof EntryRow): number[] =>
			dayKeys.map((d) =>
				sum(
					(byDay.get(d) ?? []).map((r) => r[key] as number | null | undefined),
				),
			);
		const seriesSocial = (): number[] =>
			dayKeys.map(
				(d) =>
					(byDay.get(d) ?? []).filter((r) => r.social_relation !== null).length,
			);
		const seriesBool = (key: keyof EntryRow): boolean[] =>
			dayKeys.map((d) => (byDay.get(d) ?? []).some((r) => r[key] === true));

		const series30d: DashboardSeries = {
			mood: seriesAvg("mood"),
			energy: seriesAvg("energy"),
			concentration: seriesAvg("concentration"),
			anxiety: seriesAvg("anxiety"),
			stress: seriesAvg("stress"),
			sleepHours: seriesAvg("sleep_hours"),
			sleepQuality: seriesAvg("sleep_quality"),
			water: seriesSum("water_glasses"),
			exercise: seriesSum("exercise_min"),
			daylight: seriesSum("daylight_min"),
			social: seriesSocial(),
			caffeine: seriesSum("caffeine"),
			alcohol: seriesSum("alcohol"),
			nicotine: seriesSum("nicotine"),
			drugs: seriesSum("drugs"),
			showered: seriesBool("showered"),
			brushed_teeth: seriesBool("brushed_teeth"),
			dressed: seriesBool("dressed"),
			ate_meals: seriesBool("ate_meals"),
		};

		const distinctDays30 = new Set(all.map((r) => r.logged_for)).size;

		const sleepHoursToday = latestNumber(todays, "sleep_hours");
		const sleepQualityToday = latestNumber(todays, "sleep_quality");

		const displayName =
			(user.user_metadata as { name?: string; full_name?: string } | null)
				?.name ??
			(user.user_metadata as { full_name?: string } | null)?.full_name ??
			user.email?.split("@")[0] ??
			"Du";

		const now = new Date();

		return {
			displayName,
			partOfDay: partOfDay(now),
			todayLabel: formatTodayLabel(now),
			loggedDaysLast30: distinctDays30,
			stats: {
				moodAvg7d: avg(last7.map((r) => r.mood)),
				sleepHoursAvg7d: avg(last7.map((r) => r.sleep_hours)),
				waterToday: sum(todays.map((r) => r.water_glasses)),
				checkinsLast30: distinctDays30,
			},
			today: {
				mood: latestNumber(todays, "mood"),
				energy: latestNumber(todays, "energy"),
				concentration: latestNumber(todays, "concentration"),
				anxiety: latestNumber(todays, "anxiety"),
				stress: latestNumber(todays, "stress"),
				sleepHours: sleepHoursToday,
				sleepQuality: sleepQualityToday,
				water: sum(todays.map((r) => r.water_glasses)),
				exercise: sum(todays.map((r) => r.exercise_min)),
				daylight: sum(todays.map((r) => r.daylight_min)),
				showered: todays.some((r) => r.showered === true),
				brushed_teeth: todays.some((r) => r.brushed_teeth === true),
				dressed: todays.some((r) => r.dressed === true),
				ate_meals: todays.some((r) => r.ate_meals === true),
				social: todays.filter((r) => r.social_relation !== null).length,
				caffeine: sum(todays.map((r) => r.caffeine)),
				alcohol: sum(todays.map((r) => r.alcohol)),
				nicotine: sum(todays.map((r) => r.nicotine)),
				drugs: sum(todays.map((r) => r.drugs)),
			},
			avg7d: {
				mood: avg(last7.map((r) => r.mood)),
				energy: avg(last7.map((r) => r.energy)),
				concentration: avg(last7.map((r) => r.concentration)),
				anxiety: avg(last7.map((r) => r.anxiety)),
				stress: avg(last7.map((r) => r.stress)),
				sleepHours: avg(last7.map((r) => r.sleep_hours)),
				sleepQuality: avg(last7.map((r) => r.sleep_quality)),
				waterPerDay: sum(last7.map((r) => r.water_glasses)) / 7,
				exercisePerDay: sum(last7.map((r) => r.exercise_min)) / 7,
				daylightPerDay: sum(last7.map((r) => r.daylight_min)) / 7,
				socialPerDay:
					last7.filter((r) => r.social_relation !== null).length / 7,
				caffeinePerDay: sum(last7.map((r) => r.caffeine)) / 7,
				alcoholPerDay: sum(last7.map((r) => r.alcohol)) / 7,
				nicotinePerDay: sum(last7.map((r) => r.nicotine)) / 7,
				drugsPerDay: sum(last7.map((r) => r.drugs)) / 7,
			},
			recent: all
				.map((r) => ({
					id: r.id,
					loggedFor: r.logged_for,
					note: r.note,
					summary: describeEntry(r),
				}))
				.filter((r) => r.note || r.summary)
				.slice(0, 5),
			series30d,
		};
	},
);

export type ChartSeries = {
	days: number;
	mood: number[];
	energy: number[];
	sleepHours: number[];
	anxiety: number[];
	stress: number[];
	concentration: number[];
};

type ChartRow = Pick<
	EntryRow,
	| "logged_for"
	| "mood"
	| "energy"
	| "sleep_hours"
	| "anxiety"
	| "stress"
	| "concentration"
>;

export const getChartSeries = createServerFn({ method: "POST" })
	.inputValidator(z.object({ days: z.number().int().min(1).max(366) }))
	.handler(async ({ data }): Promise<ChartSeries> => {
		const supabase = createSupabaseServerClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();
		if (userError || !user) throw new Error("Inte inloggad");

		const { days } = data;
		const start = daysAgoISO(days - 1);

		const { data: rows, error } = await supabase
			.from("entries")
			.select(
				"logged_for, mood, energy, sleep_hours, anxiety, stress, concentration",
			)
			.eq("user_id", user.id)
			.gte("logged_for", start)
			.lte("logged_for", todayISO());

		if (error) throw new Error(error.message);
		const all = (rows as ChartRow[]) ?? [];

		const dayKeys: string[] = [];
		for (let i = days - 1; i >= 0; i--) dayKeys.push(daysAgoISO(i));
		const byDay = new Map<string, ChartRow[]>();
		for (const r of all) {
			const list = byDay.get(r.logged_for) ?? [];
			list.push(r);
			byDay.set(r.logged_for, list);
		}
		const seriesAvg = (key: keyof ChartRow): number[] => {
			let last = 0;
			return dayKeys.map((d) => {
				const v = avg((byDay.get(d) ?? []).map((r) => r[key] as number | null));
				if (v !== null) last = v;
				return Number(last.toFixed(2));
			});
		};

		return {
			days,
			mood: seriesAvg("mood"),
			energy: seriesAvg("energy"),
			sleepHours: seriesAvg("sleep_hours"),
			anxiety: seriesAvg("anxiety"),
			stress: seriesAvg("stress"),
			concentration: seriesAvg("concentration"),
		};
	});
