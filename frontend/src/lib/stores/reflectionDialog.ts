import { writable } from 'svelte/store';

type ReflectionDialogState = {
	open: boolean;
	date: string | null;
};

const createReflectionDialogStore = () => {
	const { subscribe, set } = writable<ReflectionDialogState>({ open: false, date: null });

	return {
		subscribe,
		open: (date?: string) => set({ open: true, date: date ?? null }),
		close: () => set({ open: false, date: null })
	};
};

export const reflectionDialog = createReflectionDialogStore();
