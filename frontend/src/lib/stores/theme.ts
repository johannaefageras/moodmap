import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	// Get initial theme from localStorage or system preference
	const getInitialTheme = (): Theme => {
		if (!browser) return 'light';
		
		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored === 'light' || stored === 'dark') {
			return stored;
		}
		
		// Check system preference
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
		
		return 'light';
	};

	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	const disableTransitionsTemporarily = () => {
		if (!browser) return;
		document.documentElement.classList.add('theme-changing');
		window.setTimeout(() => {
			document.documentElement.classList.remove('theme-changing');
		}, 60);
	};

	// Apply theme to document
	const applyTheme = (theme: Theme) => {
		if (!browser) return;
		disableTransitionsTemporarily();
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	};

	// Initialize theme on load
	if (browser) {
		const initial = getInitialTheme();
		applyTheme(initial);
	}

	return {
		subscribe,
		set: (theme: Theme) => {
			applyTheme(theme);
			set(theme);
		},
		toggle: () => {
			update((current) => {
				const next = current === 'light' ? 'dark' : 'light';
				applyTheme(next);
				return next;
			});
		},
	};
}

export const theme = createThemeStore();
