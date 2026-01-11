export interface MoodEntry {
	id: number;
	mood_level: number;
	note?: string;
	tags: Tag[];
	timestamp: string;
	created_at: string;
	updated_at: string;
}

export interface Tag {
	id: number;
	name: string;
	color?: string;
}

export interface DailyAggregate {
	date: string;
	average_mood: number;
	entry_count: number;
	min_mood: number;
	max_mood: number;
}

export type DailyLogChoice = 'none' | 'light' | 'moderate' | 'intense' | 'little' | 'some' | 'lots' | 'heavy';

export interface DailyLog {
	id: number;
	date: string;
	logged_at: string;
	sleep_hours: number | null;
	sleep_quality: number | null;
	energy: number | null;
	appetite: number | null;
	anxiety: number | null;
	stress: number | null;
	concentration: number | null;
	exercise: DailyLogChoice | null;
	social: DailyLogChoice | null;
	daylight: DailyLogChoice | null;
	alcohol: DailyLogChoice | null;
	nicotine: DailyLogChoice | null;
	other_substances: DailyLogChoice | null;
	notes: string;
	created_at: string;
	updated_at: string;
}

export interface DailyReflection {
	id: number;
	date: string;
	entry: string;
	created_at: string;
	updated_at: string;
}

export interface User {
	id: number;
	email: string;
	display_name?: string;
}

export type GraphView = 'day' | 'week' | 'month' | 'year';
