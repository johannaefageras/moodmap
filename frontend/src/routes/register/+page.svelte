<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let displayName = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (password !== passwordConfirm) {
			error = 'Lösenorden matchar inte';
			return;
		}

		loading = true;

		try {
			await auth.register({
				email,
				password,
				password_confirm: passwordConfirm,
				display_name: displayName || undefined
			});
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Något gick fel';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Skapa konto – Moodmap</title>
</svelte:head>

<div class="max-w-sm mx-auto">
	<div class="flex items-center gap-3 mb-8">
		<i class="mi-user text-3xl text-base-content/70"></i>
		<h1 class="font-display text-2xl" style="font-weight: 600;">Skapa konto</h1>
	</div>

	{#if error}
		<div class="flex items-center gap-2 text-sm text-error mb-6 p-3 bg-error/10 rounded-md">
			<i class="mi-alert-circle text-lg"></i>
			<span>{error}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div>
			<label class="flex items-center gap-2 mb-2" for="email" style="font-weight: 500;">
				<i class="mi-user text-base text-base-content/50"></i>
				<span>E-post</span>
			</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				class="w-full px-3 py-2.5 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
				required
			/>
		</div>

		<div>
			<label class="flex items-center gap-2 mb-2" for="displayName" style="font-weight: 500;">
				<i class="mi-signature text-base text-base-content/50"></i>
				<span>Namn</span>
				<span class="text-base-content/40 text-xs">(valfritt)</span>
			</label>
			<input
				type="text"
				id="displayName"
				bind:value={displayName}
				class="w-full px-3 py-2.5 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
			/>
		</div>

		<div>
			<label class="flex items-center gap-2 mb-2" for="password" style="font-weight: 500;">
				<i class="mi-padlock-lock text-base text-base-content/50"></i>
				<span>Lösenord</span>
			</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				class="w-full px-3 py-2.5 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
				required
				minlength="8"
			/>
		</div>

		<div>
			<label class="flex items-center gap-2 mb-2" for="passwordConfirm" style="font-weight: 500;">
				<i class="mi-check text-base text-base-content/50"></i>
				<span>Bekräfta lösenord</span>
			</label>
			<input
				type="password"
				id="passwordConfirm"
				bind:value={passwordConfirm}
				class="w-full px-3 py-2.5 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40"
				required
			/>
		</div>

		<button
			type="submit"
			class="w-full py-2.5 bg-base-content text-base-100 rounded-md text-sm disabled:opacity-50 hover:bg-base-content/90 transition-colors flex items-center justify-center gap-2"
			style="font-weight: 600;"
			disabled={loading}
		>
			{#if loading}
				<i class="mi-loading-circle mi-is-spinning text-base"></i>
				<span>Skapar konto...</span>
			{:else}
				<i class="mi-add-bold text-base"></i>
				<span>Skapa konto</span>
			{/if}
		</button>
	</form>

	<p class="mt-8 text-sm text-base-content/60 flex items-center gap-2">
		<i class="mi-help-circle text-base"></i>
		<span>Har du redan ett konto? <a href="/login" class="underline hover:text-base-content transition-colors">Logga in</a></span>
	</p>
</div>
