<script lang="ts">
	import '../app.css';
	import { auth } from '$lib/stores/auth';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	// Format today's date in Swedish
	const today = new Date();
	const formattedDate = today.toLocaleDateString('sv-SE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Stockholm'
	});
	const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

	// Get time-based greeting
	function getGreeting(): string {
		const hour = new Date().toLocaleString('sv-SE', { 
			hour: 'numeric', 
			hour12: false,
			timeZone: 'Europe/Stockholm' 
		});
		const h = parseInt(hour, 10);
		
		if (h >= 5 && h < 10) return 'Godmorgon';
		if (h >= 10 && h < 12) return 'God förmiddag';
		if (h >= 12 && h < 18) return 'God eftermiddag';
		if (h >= 18 && h < 23) return 'God kväll';
		return 'God natt';
	}

	const greeting = getGreeting();
</script>

<div class="min-h-screen flex flex-col" style="background-color: var(--color-base-100);">
	<header class="sticky top-0 z-20 border-b" style="background-color: var(--color-base-100); border-color: var(--color-base-300);">
		<div class="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
			<a href="/" class="flex flex-col group">
				<span class="font-display text-lg tracking-tight" style="font-weight: 600;">
					{greeting}{#if $auth.user}, {$auth.user.display_name || $auth.user.email.split('@')[0]}{/if}
				</span>
				<span class="text-sm text-base-content/50">{capitalizedDate}</span>
			</a>

			<nav class="flex items-center gap-2">
				{#if $auth.loading}
					<span class="text-sm text-base-content/40">...</span>
				{:else if $auth.user}
					<a 
						href="/profile" 
						class="icon-box icon-box-md icon-box-hover text-base-content/60 hover:text-base-content transition-colors"
						aria-label="Min profil"
						title="Min profil"
					>
						<i class="mi-user icon-hover"></i>
					</a>
				{:else}
					<div class="flex items-center gap-2 text-sm">
						<a 
							href="/login" 
							class="text-base-content/70 hover:text-base-content transition-colors"
						>
							Logga in
						</a>
						<span class="text-base-content/30">·</span>
						<a 
							href="/register" 
							class="text-base-content/70 hover:text-base-content transition-colors"
						>
							Skapa konto
						</a>
					</div>
				{/if}

				<!-- Theme toggle -->
				<ThemeToggle />

				<!-- Logout button (icon) -->
				{#if $auth.user}
					<button
						onclick={() => auth.logout()}
						class="icon-box icon-box-md icon-box-hover text-base-content/60 hover:text-base-content transition-colors"
						aria-label="Logga ut"
						title="Logga ut"
					>
						<i class="mi-logout-3 icon-hover"></i>
					</button>
				{/if}
			</nav>
		</div>
	</header>

	<main class="flex-1">
		<div class="max-w-6xl mx-auto px-4 py-8">
			{@render children()}
		</div>
	</main>

	<footer class="border-t mt-8" style="background-color: var(--color-base-100); border-color: var(--color-base-300);">
		<div class="max-w-6xl mx-auto px-4 py-4 text-center text-sm text-base-content/40">
			Copyright © Moodmap 2025
		</div>
	</footer>
</div>
