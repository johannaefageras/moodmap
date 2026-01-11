import { writable } from 'svelte/store';

export type WeatherSnapshot = {
	summary: string | null;
	location: string | null;
	temperature: number | null;
	resolvedKey: string | null;
	updatedAt: string | null;
};

export const weatherSnapshot = writable<WeatherSnapshot>({
	summary: null,
	location: null,
	temperature: null,
	resolvedKey: null,
	updatedAt: null
});
