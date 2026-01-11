import { writable } from 'svelte/store';
import type { User } from '$lib/types';
import * as authApi from '$lib/api/auth';

interface AuthState {
	user: User | null;
	token: string | null;
	loading: boolean;
}

const STORAGE_KEY = 'moodmap_auth';

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		token: null,
		loading: true
	});

	// Load from localStorage on init
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const { user, token } = JSON.parse(stored);
				set({ user, token, loading: false });
			} catch {
				set({ user: null, token: null, loading: false });
			}
		} else {
			set({ user: null, token: null, loading: false });
		}
	}

	function persist(user: User | null, token: string | null) {
		if (typeof window !== 'undefined') {
			if (user && token) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	}

	return {
		subscribe,

		async login(email: string, password: string) {
			const response = await authApi.login(email, password);
			persist(response.user, response.token);
			set({ user: response.user, token: response.token, loading: false });
			return response.user;
		},

		async register(data: {
			email: string;
			password: string;
			password_confirm: string;
			display_name?: string;
		}) {
			const response = await authApi.register(data);
			persist(response.user, response.token);
			set({ user: response.user, token: response.token, loading: false });
			return response.user;
		},

		async logout() {
			update((state) => {
				if (state.token) {
					authApi.logout(state.token).catch(() => {});
				}
				return state;
			});
			persist(null, null);
			set({ user: null, token: null, loading: false });
		},

		async refreshProfile() {
			update((state) => {
				if (state.token) {
					authApi.getProfile(state.token).then((user) => {
						persist(user, state.token);
						set({ user, token: state.token, loading: false });
					});
				}
				return state;
			});
		},

		getToken(): string | null {
			let token: string | null = null;
			subscribe((state) => {
				token = state.token;
			})();
			return token;
		}
	};
}

export const auth = createAuthStore();
