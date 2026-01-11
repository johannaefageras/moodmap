<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';
	import DailyReflectionDialog from '$lib/components/DailyReflectionDialog.svelte';
	import { reflectionDialog } from '$lib/stores/reflectionDialog';

	const storageKey = 'moodmap-water-tracker';
	const breathingStorageKey = 'moodmap-breathing-usage';
	const totalGlasses = 8;
	let glasses = Array.from({ length: totalGlasses }, () => false);
	let dateKey = '';
	let dateCheckInterval: ReturnType<typeof setInterval> | null = null;
	let isBreathing = false;
	let breathingUsed = false;
	let breathPhase: 'in' | 'out' | 'pause' = 'in';
	let breathInterval: ReturnType<typeof setInterval> | null = null;
	let breathTimeouts: ReturnType<typeof setTimeout>[] = [];
	let breathCycleKey = 0;

	const totalBreathTime = 11000;
	const breatheInTime = 4000;
	const breatheOutTime = 5000;
	const pauseTime = 2000;

	const stockholmFormatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Europe/Stockholm',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});

	const getStockholmDateKey = (date = new Date()) => stockholmFormatter.format(date);

	const resetGlasses = () => {
		dateKey = getStockholmDateKey();
		glasses = Array.from({ length: totalGlasses }, () => false);
		saveState();
	};

	const loadState = () => {
		const currentKey = getStockholmDateKey();
		dateKey = currentKey;
		const raw = localStorage.getItem(storageKey);
		if (!raw) {
			return;
		}
		try {
			const parsed = JSON.parse(raw) as { dateKey?: string; glasses?: boolean[] };
			if (parsed.dateKey === currentKey && Array.isArray(parsed.glasses)) {
				glasses = parsed.glasses.slice(0, totalGlasses).map(Boolean);
				if (glasses.length < totalGlasses) {
					glasses = glasses.concat(
						Array.from({ length: totalGlasses - glasses.length }, () => false)
					);
				}
			}
		} catch {
			// Ignore corrupted storage and continue with defaults.
		}
	};

	const loadBreathingState = () => {
		const currentKey = getStockholmDateKey();
		const raw = localStorage.getItem(breathingStorageKey);
		if (!raw) {
			breathingUsed = false;
			return;
		}
		try {
			const parsed = JSON.parse(raw) as { dateKey?: string; used?: boolean };
			if (parsed.dateKey === currentKey) {
				breathingUsed = Boolean(parsed.used);
			} else {
				breathingUsed = false;
			}
		} catch {
			breathingUsed = false;
		}
	};

	const saveState = () => {
		localStorage.setItem(storageKey, JSON.stringify({ dateKey, glasses }));
	};

	const saveBreathingState = () => {
		localStorage.setItem(
			breathingStorageKey,
			JSON.stringify({ dateKey: getStockholmDateKey(), used: breathingUsed })
		);
	};

	const toggleGlass = (index: number) => {
		glasses = glasses.map((value, idx) => (idx === index ? !value : value));
		saveState();
	};

	const syncDate = () => {
		const currentKey = getStockholmDateKey();
		if (currentKey !== dateKey) {
			resetGlasses();
			breathingUsed = false;
			saveBreathingState();
		}
	};

	const clearBreathTimers = () => {
		breathTimeouts.forEach((timeout) => clearTimeout(timeout));
		breathTimeouts = [];
		if (breathInterval) {
			clearInterval(breathInterval);
			breathInterval = null;
		}
	};

	const runBreathCycle = () => {
		breathPhase = 'in';
		breathTimeouts.push(
			setTimeout(() => {
				breathPhase = 'out';
			}, breatheInTime),
			setTimeout(() => {
				breathPhase = 'pause';
			}, breatheInTime + breatheOutTime)
		);
	};

	const startBreathing = () => {
		if (isBreathing) return;
		isBreathing = true;
		breathingUsed = true;
		saveBreathingState();
		breathCycleKey += 1;
		runBreathCycle();
		breathInterval = setInterval(runBreathCycle, totalBreathTime);
	};

	const pauseBreathing = () => {
		if (!isBreathing) return;
		isBreathing = false;
		clearBreathTimers();
	};

	const toggleBreathing = () => {
		if (isBreathing) {
			pauseBreathing();
		} else {
			startBreathing();
		}
	};

	const breathInstructionMap = {
		in: 'Andas in..',
		out: 'Andas ut..',
		pause: 'Paus..'
	} as const;

	$: breathInstruction = breathInstructionMap[breathPhase];
	$: breathPhaseClass = isBreathing
		? breathPhase === 'in'
			? 'is-in'
			: breathPhase === 'out'
				? 'is-out'
				: 'is-pause'
		: 'is-paused';

	onMount(() => {
		loadState();
		loadBreathingState();
		syncDate();
		dateCheckInterval = setInterval(syncDate, 30_000);
	});

	onDestroy(() => {
		if (dateCheckInterval) {
			clearInterval(dateCheckInterval);
		}
		clearBreathTimers();
	});
</script>

<aside class="xl:w-80 xl:flex-shrink-0 space-y-6 mt-12 xl:mt-0">
	<!-- About -->
	<div class="border border-base-200 rounded-lg p-5">
		<div class="flex items-center gap-3 group sidebar-card-heading">
			<div class="icon-box icon-box-md">
				<i class="mi-butterfly text-lg icon-muted icon-hover"></i>
			</div>
			<h3 class="font-display text-base" style="font-weight: 600;">Om Moodmap</h3>
		</div>
		<p class="text-sm text-base-content/60 leading-relaxed">
			Moodmap hjälper dig följa hur du mår över tid. Genom att logga ditt humör bygger du en bild av dina mönster — och en påminnelse om att svåra perioder går över.
		</p>
	</div>

	<WeatherWidget />

	<!-- Daily reflections -->
	<div class="border border-base-200 rounded-lg p-5">
		<div class="flex items-center gap-3 group sidebar-card-heading">
			<div class="icon-box icon-box-md">
				<i class="mi-leaf text-lg icon-muted icon-hover"></i>
			</div>
			<h3 class="font-display text-base" style="font-weight: 600;">Sätt ord på dagen</h3>
		</div>
		<p class="text-sm text-base-content/60 leading-relaxed mb-4">
			Ett lugnt incheckningsflöde som hjälper dig skapa en jordnära, ärlig text om din dag.
		</p>
		<button class="btn btn-primary w-full" type="button" onclick={() => reflectionDialog.open()}>
			Generera inlägg
			<i class="mi-ai-sparkles text-base" aria-hidden="true"></i>
		</button>
	</div>

	<!-- Drink water -->
	<div class="border border-base-200 rounded-lg p-5">
		<div class="flex items-center gap-3 group sidebar-card-heading">
			<div class="icon-box icon-box-md">
				<i class="mi-water-drop text-lg icon-muted"></i>
			</div>
			<h3 class="font-display text-base" style="font-weight: 600;">
				Drick vatten
			</h3>
		</div>
		<p class="text-sm text-base-content/60 leading-relaxed mb-4">
			Håll koll på dagens vattenintag och bocka av när du dricker ett glas vatten. Målet är ca 2 liter per dag (ett glas motsvarar ca 2,5 dl).
		</p>
		<div class="water-glass-row">
			{#each glasses as isFull, index}
				<button
					type="button"
					class="water-glass-button"
					aria-pressed={isFull}
					onclick={() => toggleGlass(index)}
				>
					<i
						class={`mi-water-glass water-glass-icon ${isFull ? 'is-full' : ''}`}
						aria-hidden="true"
					></i>
				</button>
			{/each}
		</div>
	</div>

	<!-- Breathing exercise -->
	<div class="border border-base-200 rounded-lg p-5">
		<div class="flex items-center gap-3 group sidebar-card-heading">
			<div class="icon-box icon-box-md">
				<i class="mi-well-being text-lg icon-muted icon-hover"></i>
			</div>
			<h3 class="font-display text-base" style="font-weight: 600;">
				Andas lugnt
			</h3>
		</div>
		<p class="text-sm text-base-content/60 leading-relaxed mb-6">
			Följ punkten och andas lugnt. Långsam andning hjälper kroppen att slappna av och minska stress.
		</p>
		<div class="breath-widget">
			{#key breathCycleKey}
				<div class={`breath-shell ${breathPhaseClass} ${isBreathing ? 'is-running' : ''}`}>
					<div class="breath-orbit">
						<div class="breath-ring"></div>
						<div class="breath-inner"></div>
						<div class={`breath-pointer-container ${isBreathing ? 'is-running' : ''}`}>
							<i class="mi-circle breath-pointer" aria-hidden="true"></i>
						</div>
					</div>
					<div class="breath-content">
						<button
							type="button"
							class="breath-toggle icon-box"
							onclick={toggleBreathing}
							aria-pressed={isBreathing}
						>
							<i
								class={isBreathing ? 'mi-button-pause text-xl' : 'mi-button-play text-xl'}
								aria-hidden="true"
							></i>
						</button>
						<p class="breath-instruction text-sm text-base-content/70">{breathInstruction}</p>
					</div>
				</div>
			{/key}
		</div>
	</div>

</aside>

<DailyReflectionDialog
	open={$reflectionDialog.open}
	initialDate={$reflectionDialog.date ?? undefined}
	waterGlasses={glasses}
	breathingUsed={breathingUsed}
	on:close={() => reflectionDialog.close()}
/>

<style>
	.water-glass-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 0.6rem;
		background-color: transparent;
		cursor: pointer;
	}

	.water-glass-button:hover {
		background-color: transparent;
	}

	.water-glass-button:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
		outline-offset: 2px;
	}

	:global(.water-glass-icon) {
		font-size: 1.3rem;
		font-weight: 400;
		transition: font-weight 120ms ease;
	}

	.water-glass-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: nowrap;
	}

	:global(.water-glass-icon:hover),
	.water-glass-button:hover :global(.water-glass-icon) {
		font-weight: 400;
	}

	:global(.water-glass-icon.is-full) {
		font-weight: 700;
	}

	:global(.water-glass-icon.is-full:hover),
	.water-glass-button:hover :global(.water-glass-icon.is-full) {
		font-weight: 700;
	}

	.breath-widget {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.breath-shell {
		--breath-size: 130px;
		--breath-ring-size: 148px;
		--breath-pointer-offset: 10px;
		--breath-pointer-radius: calc(var(--breath-ring-size) / 2 + 0.6rem);
		position: relative;
		width: var(--breath-size);
		height: var(--breath-size);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0.8rem 0;
	}

	.breath-orbit {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: scale(1);
		animation-play-state: paused;
	}

	.breath-shell.is-in .breath-orbit {
		animation: breath-grow 4s linear forwards;
	}

	.breath-shell.is-out .breath-orbit {
		animation: breath-shrink 5s linear forwards;
	}

	.breath-shell.is-pause .breath-orbit {
		transform: scale(1);
	}

	.breath-shell.is-paused .breath-orbit {
		transform: scale(1);
	}

	.breath-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		width: var(--breath-ring-size);
		height: var(--breath-ring-size);
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: conic-gradient(
			color-mix(in srgb, #72b9d5 88%, transparent) 0%,
			color-mix(in srgb, #72b9d5 88%, transparent) 36.3636%,
			color-mix(in srgb, #72b9d5 50%, transparent) 36.3636%,
			color-mix(in srgb, #72b9d5 50%, transparent) 81.8182%,
			color-mix(in srgb, #72b9d5 24%, transparent) 81.8182%,
			color-mix(in srgb, #72b9d5 24%, transparent) 100%
		);
		z-index: 1;
	}

	.breath-inner {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: var(--color-base-100);
		border: 1px solid var(--color-base-300);
		position: relative;
		z-index: 2;
	}

	.breath-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		cursor: pointer;
	}

	.breath-toggle:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
		outline-offset: 2px;
	}

	.breath-content {
		position: absolute;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.breath-pointer-container {
		position: absolute;
		inset: 0;
		transform-origin: center;
		animation: none;
		transform: rotate(0deg);
		z-index: 4;
		pointer-events: none;
	}

	.breath-pointer-container.is-running {
		animation: breath-rotate 11s linear infinite;
	}

	.breath-pointer {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) translateY(calc(-1 * var(--breath-pointer-radius)));
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--color-primary);
		display: block;
		pointer-events: none;
	}

	.breath-instruction {
		text-align: center;
		min-height: 1.25rem;
		margin-top: 0;
	}

	@keyframes breath-rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes breath-grow {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.2);
		}
	}

	@keyframes breath-shrink {
		from {
			transform: scale(1.2);
		}
		to {
			transform: scale(1);
		}
	}
</style>
