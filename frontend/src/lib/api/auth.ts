import type { User } from '$lib/types';

const BASE_URL = '/api/auth';

interface AuthResponse {
	user: User;
	token: string;
}

interface ApiError {
	detail?: string;
	[key: string]: unknown;
}

async function authRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${endpoint}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		},
		...options
	});

	if (!response.ok) {
		const error: ApiError = await response.json().catch(() => ({}));
		throw new Error(error.detail || `Fel: ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json();
}

export async function register(data: {
	email: string;
	password: string;
	password_confirm: string;
	display_name?: string;
}): Promise<AuthResponse> {
	return authRequest('/register/', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function login(email: string, password: string): Promise<AuthResponse> {
	return authRequest('/login/', {
		method: 'POST',
		body: JSON.stringify({ username: email, password })
	});
}

export async function logout(token: string): Promise<void> {
	return authRequest('/logout/', {
		method: 'POST',
		headers: {
			Authorization: `Token ${token}`
		}
	});
}

export async function getProfile(token: string): Promise<User> {
	return authRequest('/me/', {
		headers: {
			Authorization: `Token ${token}`
		}
	});
}

export async function updateProfile(
	token: string,
	data: { display_name?: string }
): Promise<User> {
	return authRequest('/me/', {
		method: 'PUT',
		headers: {
			Authorization: `Token ${token}`
		},
		body: JSON.stringify(data)
	});
}

export async function changePassword(
	token: string,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	return authRequest('/me/password/', {
		method: 'PUT',
		headers: {
			Authorization: `Token ${token}`
		},
		body: JSON.stringify({
			current_password: currentPassword,
			new_password: newPassword
		})
	});
}

export async function deleteAccount(token: string): Promise<void> {
	return authRequest('/me/delete/', {
		method: 'DELETE',
		headers: {
			Authorization: `Token ${token}`
		}
	});
}
