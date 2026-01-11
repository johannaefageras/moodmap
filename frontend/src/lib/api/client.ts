import type { MoodEntry, Tag, DailyAggregate, DailyLog, DailyReflection, GraphView } from '$lib/types';
import { auth } from '$lib/stores/auth';
import { get } from 'svelte/store';

const BASE_URL = 'https://moodmap-7ihf.onrender.com/api';

function getAuthHeaders(): HeadersInit {
	const state = get(auth);
	if (state.token) {
		return { Authorization: `Token ${state.token}` };
	}
	return {};
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...getAuthHeaders(),
			...options?.headers
		},
		...options
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail || `API Error: ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json();
}

function normalizeList<T>(payload: unknown): T[] {
	if (Array.isArray(payload)) return payload;
	if (payload && typeof payload === 'object') {
		const record = payload as { data?: T[]; results?: T[] };
		if (Array.isArray(record.data)) return record.data;
		if (Array.isArray(record.results)) return record.results;
	}
	return [];
}

// Mood Entries
export async function getEntries(startDate?: string, endDate?: string): Promise<MoodEntry[]> {
	const params = new URLSearchParams();
	if (startDate) params.append('start_date', startDate);
	if (endDate) params.append('end_date', endDate);
	const query = params.toString();
	const payload = await request<unknown>(`/entries/${query ? `?${query}` : ''}`);
	return normalizeList<MoodEntry>(payload);
}

export async function createEntry(data: {
	mood_level: number;
	note?: string;
	tags?: number[];
	timestamp?: string;
}): Promise<MoodEntry> {
	return request('/entries/', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateEntry(
	id: number,
	data: { mood_level?: number; note?: string; tags?: number[] }
): Promise<MoodEntry> {
	return request(`/entries/${id}/`, {
		method: 'PUT',
		body: JSON.stringify(data)
	});
}

export async function deleteEntry(id: number): Promise<void> {
	return request(`/entries/${id}/`, { method: 'DELETE' });
}

// Tags
export async function getTags(): Promise<Tag[]> {
	const payload = await request<unknown>('/tags/');
	return normalizeList<Tag>(payload);
}

export async function createTag(name: string, color?: string): Promise<Tag> {
	return request('/tags/', {
		method: 'POST',
		body: JSON.stringify({ name, color })
	});
}

export async function deleteTag(id: number): Promise<void> {
	return request(`/tags/${id}/`, { method: 'DELETE' });
}

// Graph Data
export async function getGraphData(
	view: GraphView,
	date?: string
): Promise<DailyAggregate[]> {
	const params = new URLSearchParams({ view });
	if (date) params.append('date', date);
	return request(`/graph/?${params}`);
}

// Daily Logs
export async function getDailyLogToday(): Promise<DailyLog | { exists: false; date: string }> {
	return request('/daily-logs/today/');
}

export async function upsertDailyLog(data: Partial<DailyLog> & { date?: string }): Promise<DailyLog> {
	return request('/daily-logs/', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function getDailyLogs(params?: {
	date?: string;
	start_date?: string;
	end_date?: string;
}): Promise<DailyLog[]> {
	const search = new URLSearchParams();
	if (params?.date) search.append('date', params.date);
	if (params?.start_date) search.append('start_date', params.start_date);
	if (params?.end_date) search.append('end_date', params.end_date);
	const query = search.toString();
	const payload = await request<unknown>(`/daily-logs/${query ? `?${query}` : ''}`);
	return normalizeList<DailyLog>(payload);
}

export async function generateDailyReflection(payload: Record<string, unknown>): Promise<{ entry: string }> {
	return request('/daily-reflections/generate/', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function getDailyReflections(params?: {
	date?: string;
	start_date?: string;
	end_date?: string;
}): Promise<DailyReflection[]> {
	const search = new URLSearchParams();
	if (params?.date) search.append('date', params.date);
	if (params?.start_date) search.append('start_date', params.start_date);
	if (params?.end_date) search.append('end_date', params.end_date);
	const query = search.toString();
	const payload = await request<unknown>(`/daily-reflections/${query ? `?${query}` : ''}`);
	return normalizeList<DailyReflection>(payload);
}
