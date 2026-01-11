<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { updateProfile, changePassword, deleteAccount } from '$lib/api/auth';
	import { getDailyReflections } from '$lib/api/client';
	import type { DailyReflection } from '$lib/types';
	import { get } from 'svelte/store';

	$effect(() => {
		if (!$auth.loading && !$auth.user) {
			goto('/login');
		}
	});

	$effect(() => {
		if (!$auth.user?.id) return;
		if (reflectionsLoadedFor === $auth.user.id) return;
		void loadReflections($auth.user.id);
	});

	let displayName = $state($auth.user?.display_name || '');
	let currentPassword = $state('');
	let newPassword = $state('');
	let message = $state('');
	let error = $state('');
	let loading = $state(false);
	let showDeleteConfirm = $state(false);
	let reflections = $state<DailyReflection[]>([]);
	let reflectionsLoading = $state(false);
	let reflectionsError = $state('');
	let reflectionsLoadedFor = $state<number | null>(null);
	let selectedReflection = $state<DailyReflection | null>(null);

	const formatReflectionDate = (value: string) => {
		const date = new Date(value);
		return date.toLocaleDateString('sv-SE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	};

	const formatEntryTitle = (entry: string, dateValue: string) => {
		const trimmed = entry.trim();
		if (!trimmed) return '';
		const [title] = trimmed.split('\n\n');
		if (!title) return '';
		if (/\b\d{4}\b/.test(title)) return title;
		const year = new Date(dateValue).getFullYear();
		const parts = title.split(' — ');
		if (parts.length > 1) {
			return `${parts[0]} ${year} — ${parts.slice(1).join(' — ')}`;
		}
		return `${title} ${year}`;
	};

	const BASE_EXCERPT_WORDS = 40;
	const EXCERPT_REDUCTION_WORDS = 12;
	const MAX_EXCERPT_WORDS = Math.max(8, BASE_EXCERPT_WORDS - EXCERPT_REDUCTION_WORDS);

	const formatEntryExcerpt = (entry: string) => {
		const trimmed = entry.trim();
		if (!trimmed) return '';
		const blocks = trimmed.split('\n\n').filter((block) => block.trim());
		if (blocks.length <= 1) return '';
		const text = blocks.slice(1).join(' ');
		const words = text.split(/\s+/).filter(Boolean);
		if (words.length === 0) return '';
		const limit = Math.min(words.length, MAX_EXCERPT_WORDS);
		const excerpt = words.slice(0, limit).join(' ');
		return limit < words.length ? `${excerpt}…` : excerpt;
	};

	const loadReflections = async (userId: number) => {
		reflectionsLoading = true;
		reflectionsError = '';
		try {
			const payload = await getDailyReflections();
			reflections = (payload ?? []).slice(0, 12);
			reflectionsLoadedFor = userId;
		} catch (err) {
			reflectionsError = err instanceof Error ? err.message : 'Kunde inte hämta reflektioner.';
		} finally {
			reflectionsLoading = false;
		}
	};

	const openReflection = (reflection: DailyReflection) => {
		selectedReflection = reflection;
	};

	const closeReflection = () => {
		selectedReflection = null;
	};

	async function handleUpdateProfile(e: Event) {
		e.preventDefault();
		error = '';
		message = '';
		loading = true;

		try {
			const token = get(auth).token;
			if (token) {
				await updateProfile(token, { display_name: displayName });
				await auth.refreshProfile();
				message = 'Sparat';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Något gick fel';
		} finally {
			loading = false;
		}
	}

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		error = '';
		message = '';
		loading = true;

		try {
			const token = get(auth).token;
			if (token) {
				await changePassword(token, currentPassword, newPassword);
				message = 'Lösenordet har ändrats';
				currentPassword = '';
				newPassword = '';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Något gick fel';
		} finally {
			loading = false;
		}
	}

	async function handleDeleteAccount() {
		loading = true;
		try {
			const token = get(auth).token;
			if (token) {
				await deleteAccount(token);
				await auth.logout();
				goto('/');
			}
		} catch {
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Profil – Moodmap</title>
</svelte:head>

{#if $auth.user}
	<div class="profile-layout">
		<div class="profile-main">
			<div class="flex items-center gap-3 mb-8">
				<h1 class="font-display text-2xl" style="font-weight: 600;">Min Profil</h1>
			</div>

			{#if message}
				<div class="flex items-center gap-2 text-sm text-success p-3 bg-success/10 rounded-md mb-6">
					<i class="mi-check text-lg"></i>
					<span>{message}</span>
				</div>
			{/if}
			{#if error}
				<div class="flex items-center gap-2 text-sm text-error p-3 bg-error/10 rounded-md mb-6">
					<i class="mi-alert-circle text-lg"></i>
					<span>{error}</span>
				</div>
			{/if}

			<div class="space-y-12">
				<!-- Profile -->
				<section>
					<h2 class="font-display text-lg mb-6" style="font-weight: 600;">Kontoinformation</h2>

					<form onsubmit={handleUpdateProfile} class="space-y-5">
						<div class="grid gap-5 sm:grid-cols-2">
							<div>
								<label class="block text-sm mb-2" for="email" style="font-weight: 500;">
									E-postadress
								</label>
								<input
									type="email"
									id="email"
									value={$auth.user.email}
									class="w-full px-3 py-2 border border-base-300 rounded-md bg-base-200 text-base-content/60"
									disabled
								/>
							</div>

							<div>
								<label class="block text-sm mb-2" for="displayName" style="font-weight: 500;">
									Visningsnamn
								</label>
								<input
									type="text"
									id="displayName"
									bind:value={displayName}
									class="w-full px-3 py-2 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
								/>
							</div>
						</div>

						<button
							type="submit"
							class="px-5 py-2 bg-base-content text-base-100 rounded-md text-sm disabled:opacity-50 hover:bg-base-content/90 transition-colors inline-flex items-center gap-2"
							style="font-weight: 600;"
							disabled={loading}
						>
							{#if loading}
								<i class="mi-loading-circle mi-is-spinning text-base"></i>
							{:else}
								<i class="mi-save text-base"></i>
							{/if}
							<span>Spara</span>
						</button>
					</form>
				</section>

				<!-- Password -->
				<section class="pt-8 border-t border-base-200">
					<h2 class="font-display text-lg mb-6" style="font-weight: 600;">Byt lösenord</h2>

					<form onsubmit={handleChangePassword} class="space-y-5">
						<div class="grid gap-5 sm:grid-cols-2">
							<div>
								<label class="block text-sm mb-2" for="currentPassword" style="font-weight: 500;">
									Nuvarande lösenord
								</label>
								<input
									type="password"
									id="currentPassword"
									bind:value={currentPassword}
									class="w-full px-3 py-2 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
									required
								/>
							</div>

							<div>
								<label class="block text-sm mb-2" for="newPassword" style="font-weight: 500;">
									Nytt lösenord
								</label>
								<input
									type="password"
									id="newPassword"
									bind:value={newPassword}
									class="w-full px-3 py-2 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
									required
									minlength="8"
								/>
							</div>
						</div>

						<button
							type="submit"
							class="px-5 py-2 bg-base-content text-base-100 rounded-md text-sm disabled:opacity-50 hover:bg-base-content/90 transition-colors inline-flex items-center gap-2"
							style="font-weight: 600;"
							disabled={loading}
						>
							{#if loading}
								<i class="mi-loading-circle mi-is-spinning text-base"></i>
							{:else}
								<i class="mi-check-bold text-base"></i>
							{/if}
							<span>Byt lösenord</span>
						</button>
					</form>
				</section>

				<!-- Delete -->
				<section class="pt-8 border-t border-base-200">
					<h2 class="font-display text-lg mb-2" style="font-weight: 600;">Radera konto</h2>
					<p class="text-sm text-base-content/60 mb-5">
						Detta raderar permanent ditt konto och all data.
					</p>

					{#if showDeleteConfirm}
						<div class="p-4 bg-error/10 rounded-lg">
							<p class="text-sm text-error flex items-center gap-2 mb-4">
								<i class="mi-alert-circle text-base"></i>
								<span>Är du säker? Denna åtgärd kan inte ångras.</span>
							</p>
							<div class="flex gap-3">
								<button
									onclick={handleDeleteAccount}
									class="px-5 py-2 bg-error text-error-content rounded-md text-sm disabled:opacity-50 hover:bg-error/90 transition-colors inline-flex items-center gap-2"
									style="font-weight: 600;"
									disabled={loading}
								>
									{#if loading}
										<i class="mi-loading-circle mi-is-spinning text-base"></i>
									{:else}
										<i class="mi-trash text-base"></i>
									{/if}
									<span>Ja, radera</span>
								</button>
								<button
									onclick={() => showDeleteConfirm = false}
									class="px-5 py-2 text-sm text-base-content/60 hover:text-base-content transition-colors inline-flex items-center gap-2"
								>
									<i class="mi-delete text-base"></i>
									<span>Avbryt</span>
								</button>
							</div>
						</div>
					{:else}
						<button
							onclick={() => showDeleteConfirm = true}
							class="text-sm text-error hover:text-error/80 transition-colors inline-flex items-center gap-2"
						>
							<i class="mi-trash text-base"></i>
							<span>Radera mitt konto</span>
						</button>
					{/if}
				</section>
			</div>
		</div>

		<aside class="profile-reflections">
			<div class="flex items-center justify-between mb-5">
				<h2 class="font-display text-lg" style="font-weight: 600;">Dagreflektioner</h2>
				<span class="text-xs text-base-content/50">Senaste 12</span>
			</div>

			{#if reflectionsLoading}
				<p class="text-sm text-base-content/60">Hämtar...</p>
			{:else if reflectionsError}
				<p class="text-sm text-error">{reflectionsError}</p>
			{:else if reflections.length === 0}
				<p class="text-sm text-base-content/60">Inga reflektioner ännu.</p>
			{:else}
				<div class="reflection-stack">
					{#each reflections as reflection}
						<button
							type="button"
							class="reflection-card reflection-card-button"
							onclick={() => openReflection(reflection)}
						>
							<div class="reflection-card-header">
								<span class="reflection-card-date">{formatReflectionDate(reflection.date)}</span>
								<i class="mi-arrow-right text-base-content/40" aria-hidden="true"></i>
							</div>
							<p class="reflection-card-entry">{formatEntryExcerpt(reflection.entry)}</p>
						</button>
					{/each}
				</div>
			{/if}
		</aside>
	</div>
{/if}

{#if selectedReflection}
	<div
		class="reflection-modal-backdrop"
		role="button"
		tabindex="0"
		onclick={closeReflection}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				closeReflection();
			}
		}}
	>
		<div
			class="reflection-modal"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					closeReflection();
				}
			}}
		>
			<button
				class="reflection-modal-close"
				type="button"
				onclick={closeReflection}
				aria-label="Stäng"
			>
				<i class="mi-delete text-lg"></i>
			</button>
			<div class="entry-result">
				<article class="entry-paper">
					{#if selectedReflection.entry}
						{#each selectedReflection.entry.split('\n\n') as block, index}
							{#if block.trim()}
								{#if index === 0}
									<h3 class="entry-title">
										{formatEntryTitle(selectedReflection.entry, selectedReflection.date)}
									</h3>
								{:else}
									<p class="entry-paragraph" class:is-first={index === 1}>{block}</p>
								{/if}
							{/if}
						{/each}
					{:else}
						<p class="text-sm text-base-content/60">Ingen text kunde skapas.</p>
					{/if}
				</article>
			</div>
		</div>
	</div>
{/if}

<style>
	.profile-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: 2.5rem;
		width: 100%;
		max-width: 72rem;
		margin: 0 auto;
	}

	.profile-main {
		width: 100%;
		max-width: 40rem;
	}

	.profile-reflections {
		width: 100%;
	}

	.reflection-stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.reflection-card {
		padding: 1rem 1.15rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--color-base-300) 55%, transparent);
		background: var(--color-base-100);
		box-shadow: 0 10px 30px -24px color-mix(in srgb, var(--color-base-content) 25%, transparent);
	}

	.reflection-card-button {
		text-align: left;
		width: 100%;
		transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
	}

	.reflection-card-button:hover {
		border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-base-300));
		box-shadow: 0 16px 40px -30px color-mix(in srgb, var(--color-base-content) 30%, transparent);
		transform: translateY(-1px);
	}

	.reflection-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.reflection-card-date {
		font-size: 0.92rem;
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
		text-transform: capitalize;
	}

	.reflection-card-entry {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: color-mix(in srgb, var(--color-base-content) 85%, transparent);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.reflection-modal-backdrop {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, #000 50%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 60;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.reflection-modal {
		background: var(--color-base-100);
		border-radius: 1rem;
		width: min(42rem, 100%);
		max-height: min(80vh, 46rem);
		display: flex;
		flex-direction: column;
		position: relative;
		border: 1px solid color-mix(in srgb, var(--color-base-300) 60%, transparent);
		box-shadow: 0 30px 70px -50px color-mix(in srgb, var(--color-base-content) 45%, transparent);
	}

	.reflection-modal-close {
		width: 2.25rem;
		height: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.6rem;
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
		transition: background 0.2s ease, color 0.2s ease;
		position: absolute;
		top: 0.9rem;
		right: 0.9rem;
	}

	.reflection-modal-close:hover {
		background: color-mix(in srgb, var(--color-base-200) 80%, transparent);
		color: var(--color-base-content);
	}

	.entry-result {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 1.6rem 1.6rem 1.6rem 1.6rem;
	}

	.entry-paper {
		padding: 2rem;
		border-radius: 1rem;
		background: var(--color-base-100);
		border: 1px solid var(--color-base-200);
		box-shadow: none;
	}

	.entry-title {
		font-family: var(--font-sans);
		font-size: 1.1rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-base-content) 55%, transparent);
		margin: 0 0 1.5rem 0;
		line-height: 1.4;
	}

	.entry-paragraph {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.7;
		color: var(--color-base-content);
		margin: 0 0 1em 0;
		max-width: 52ch;
		text-align: justify;
		hyphens: auto;
		text-indent: 1.5em;
	}

	.entry-paragraph:last-of-type {
		margin-bottom: 0;
	}

	.entry-paragraph.is-first {
		text-indent: 0;
	}

	.entry-paragraph.is-first::first-letter {
		float: left;
		font-family: var(--font-display);
		font-size: 3.5rem;
		line-height: 0.8;
		font-weight: 600;
		color: var(--color-primary);
		padding-right: 0.5rem;
		padding-top: 0.1em;
	}

	@media (max-width: 640px) {
		.entry-paper {
			padding: 1.5rem;
		}
	}

	@media (max-width: 1024px) {
		.profile-layout {
			grid-template-columns: 1fr;
		}

		.profile-main {
			max-width: 100%;
		}
	}
</style>
