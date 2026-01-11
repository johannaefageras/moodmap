<script lang="ts">
	const sampleEntries = {
		grounded: `Lördag 11 januari 2025 — En dag som höll ihop

Dagen började trögt. Sömnen hade varit hackig, kanske fem timmar totalt, och kroppen protesterade redan vid första kaffet. Jobbet rullade på utan större motstånd, mest möten och mejl, men koncentrationen var inte på topp. Lunchen blev en macka vid skrivbordet, inte för att det var bråttom, utan för att orken inte räckte till att gå ut. Stressen låg som en dov ton i bakgrunden hela eftermiddagen, inte akut men närvarande.

Kvällen blev bättre. En promenad runt kvarteret, bara tjugo minuter, men det räckte för att lufta huvudet. Lagade en enkel pasta och kollade på en dokumentär utan att egentligen följa handlingen särskilt noga. Telefonen låg kvar i köket hela kvällen, och det kändes som en liten seger.

Det var ingen stor dag, men det var en dag som höll ihop. Grunderna var på plats: mat, rörelse, en stunds stillhet. Ibland räcker det. Ibland är det precis vad som behövs.`,

		warm: `Lördag 11 januari 2025 — Små ljusglimtar

Det var en av de där dagarna som börjar i motlut. Kroppen var trött efter en natt med för lite sömn, och tanken på allt som väntade kändes tung redan vid frukostbordet. Men du tog dig upp, satte på kaffe, och lät dagen börja i sin egen takt. Det finns något tappert i det, även om det inte alltid känns så.

Men dagen hade sina ögonblick. Ett oväntat samtal från en vän mitt på dagen, bara några minuter, men det värmde mer än väntat. Solen tittade fram en kort stund vid lunch, och du tog tillfället att gå ut, om så bara för att känna den kyliga luften mot ansiktet. Kvällen spenderades i lugn och ro på soffan med något som flimrade på skärmen.

Du tog dig igenom dagen, med allt vad den innebar. Tröttheten, de små ljusglimtarna, tystnaden på kvällen. Allt detta är också ett liv. Det finns något fint i det, även när det inte känns så.`,

		minimal: `Lördag 11 januari 2025

Sov dåligt, fem timmar. Jobbade, mest möten. Macka vid skrivbordet. Promenad efter jobbet, tjugo minuter. Pasta till middag. Dokumentär på kvällen. Telefonen i köket. Tidigt i säng.`
	};

	let currentTone: 'grounded' | 'warm' | 'minimal' = $state('grounded');
</script>

<svelte:head>
	<title>Förhandsvisning — Moodmap</title>
</svelte:head>

<div class="preview-page">
	<div class="preview-container">
		<header class="preview-header">
			<div class="flex items-center gap-3">
				<div class="icon-box icon-box-md">
					<i class="mi-ai-generate-text-spark text-lg icon-muted"></i>
				</div>
				<div>
					<h1 class="font-display text-xl" style="font-weight: 600;">Förhandsvisning</h1>
					<p class="text-sm text-base-content/60">Testa olika stilar utan att använda API-krediter</p>
				</div>
			</div>
			<a href="/" class="btn btn-ghost btn-sm">
				<i class="mi-arrow-left"></i>
				Tillbaka
			</a>
		</header>

		<nav class="tone-switcher">
			<button
				type="button"
				class="tone-tab"
				class:is-active={currentTone === 'grounded'}
				onclick={() => (currentTone = 'grounded')}
			>
				<span class="icon-box icon-box-md">
					<i class="mi-sprout text-lg icon-muted"></i>
				</span>
				<span class="tone-tab-content">
					<span class="tone-tab-title">Jordnära</span>
					<span class="tone-tab-desc">Saklig och ärlig</span>
				</span>
			</button>
			<button
				type="button"
				class="tone-tab"
				class:is-active={currentTone === 'warm'}
				onclick={() => (currentTone = 'warm')}
			>
				<span class="icon-box icon-box-md">
					<i class="mi-heart text-lg icon-muted"></i>
				</span>
				<span class="tone-tab-content">
					<span class="tone-tab-title">Varm</span>
					<span class="tone-tab-desc">Lite mjukare ton</span>
				</span>
			</button>
			<button
				type="button"
				class="tone-tab"
				class:is-active={currentTone === 'minimal'}
				onclick={() => (currentTone = 'minimal')}
			>
				<span class="icon-box icon-box-md">
					<i class="mi-text-notes text-lg icon-muted"></i>
				</span>
				<span class="tone-tab-content">
					<span class="tone-tab-title">Avskalad</span>
					<span class="tone-tab-desc">Kortfattat</span>
				</span>
			</button>
		</nav>

		<article class="entry-paper">
			{#each sampleEntries[currentTone].split('\n\n') as block, index}
				{#if block.trim()}
					{#if index === 0}
						<h3 class="entry-title">{block}</h3>
					{:else}
						<p class="entry-paragraph" class:is-first={index === 1}>{block}</p>
					{/if}
				{/if}
			{/each}
		</article>
	</div>
</div>

<style>
	.preview-page {
		min-height: 100vh;
		padding: 2rem 1rem;
		display: flex;
		justify-content: center;
	}

	.preview-container {
		width: 100%;
		max-width: 36rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.preview-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.tone-switcher {
		display: flex;
		gap: 0.75rem;
	}

	.tone-tab {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-base-200) 70%, transparent);
		background: transparent;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.tone-tab:hover {
		border-color: var(--color-base-300);
	}

	.tone-tab.is-active {
		border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.tone-tab-content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
	}

	.tone-tab-title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.tone-tab-desc {
		font-size: 0.75rem;
		color: color-mix(in srgb, var(--color-base-content) 55%, transparent);
	}

	.entry-paper {
		padding: 2rem;
		border-radius: 1rem;
		background: var(--color-base-100);
		border: 1px solid var(--color-base-200);
		box-shadow: 0 2px 10px color-mix(in srgb, var(--color-base-content) 4%, transparent);
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
		.preview-page {
			padding: 1rem;
		}

		.tone-switcher {
			flex-direction: column;
		}

		.entry-paper {
			padding: 1.5rem;
		}
	}
</style>
