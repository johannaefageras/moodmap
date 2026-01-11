<script lang="ts">
	import flatpickr from 'flatpickr';
	import { Swedish } from 'flatpickr/dist/l10n/sv.js';
	import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { DailyLog, MoodEntry } from '$lib/types';
	import { generateDailyReflection, getDailyLogs, getEntries } from '$lib/api/client';
	import { weatherSnapshot, type WeatherSnapshot } from '$lib/stores/weatherSnapshot';

	interface Props {
		open?: boolean;
		waterGlasses?: boolean[];
		breathingUsed?: boolean;
		initialDate?: string;
	}

	let { open = false, waterGlasses = [], breathingUsed = false, initialDate }: Props = $props();

	const dispatch = createEventDispatcher<{ close: void }>();
	const today = new Date().toISOString().split('T')[0];

	const steps = [
		{ id: 'date', title: 'Datum' },
		{ id: 'content', title: 'Innehåll' },
		{ id: 'mood', title: 'Humör' },
		{ id: 'hardhelpful', title: 'Mot & med' },
		{ id: 'basics', title: 'Grunder' },
		{ id: 'tone', title: 'Ton' },
		{ id: 'summary', title: 'Skapa' }
	];
	const stepIcons = [
		'mi-number-one-circle',
		'mi-number-two-circle',
		'mi-number-three-circle',
		'mi-number-four-circle',
		'mi-number-five-circle',
		'mi-number-six-circle',
		'mi-number-seven-circle'
	];

	const eventTags = [
		'Jobb',
		'Studier',
		'Läsning',
		'Möten',
		'Planering',
		'Städning',
		'Disk',
		'Tvätt',
		'Handling',
		'Ärenden',
		'Matlagning',
		'Promenad',
		'Träning',
		'Vila',
		'Tv',
		'Resor',
		'Vårdbesök',
		'Träffade någon',
		'Var utomhus',
		'Skapade',
		'Reflekterade'
	];

	const moodWords = [
		'På botten',
		'Tungt',
		'Jobbigt',
		'Lite lågt',
		'Varken bra eller dåligt',
		'Helt okej',
		'Stabilt',
		'Bara bra',
		'Jättebra',
		'Strålande'
	];

	const sleepQualityLabels: Record<number, string> = {
		1: 'Mycket dålig',
		2: 'Dålig',
		3: 'Okej',
		4: 'Bra',
		5: 'Mycket bra'
	};

	const energyLabels: Record<number, string> = {
		1: 'Mycket låg',
		2: 'Låg',
		3: 'Medel',
		4: 'Hög',
		5: 'Mycket hög'
	};

	const appetiteLabels: Record<number, string> = {
		1: 'Ingen',
		2: 'Låg',
		3: 'Normal',
		4: 'God',
		5: 'Mycket god'
	};

	const anxietyLabels: Record<number, string> = {
		1: 'Ingen',
		2: 'Lätt',
		3: 'Måttlig',
		4: 'Stark',
		5: 'Mycket stark'
	};

	const stressLabels: Record<number, string> = {
		1: 'Ingen',
		2: 'Låg',
		3: 'Måttlig',
		4: 'Hög',
		5: 'Mycket hög'
	};

	const concentrationLabels: Record<number, string> = {
		1: 'Mycket dålig',
		2: 'Dålig',
		3: 'Okej',
		4: 'Bra',
		5: 'Mycket bra'
	};

	let currentStep = $state(0);
	let entry = $state('');
	let errorMessage = $state('');
	let isGenerating = $state(false);

	let logDate = $state(today);
	let dateInput: HTMLInputElement | null = $state(null);
	let datePicker: FlatpickrInstance | null = $state(null);

	let selectedEvents = $state<string[]>([]);
	let eventDetails = $state('');

	let moodScore = $state(5);
	let moodNote = $state('');
	let moodEntries = $state<MoodEntry[]>([]);
	let moodAverage = $state<number | null>(null);
	let moodManualOverride = $state(false);

	let hardMoments = $state('');
	let helpfulMoments = $state('');

	let ate = $state(false);
	let hydrated = $state(false);
	let outside = $state(false);
	let movement = $state(false);
	let rested = $state(false);
	let tookMedication = $state(false);

	let tone = $state<'grounded' | 'warm' | 'minimal'>('grounded');

	let dailyLog = $state<DailyLog | null>(null);
	let autoLoading = $state(false);
	let autoError = $state('');

	let weather = $state<WeatherSnapshot>(get(weatherSnapshot));
	let unsubscribeWeather: (() => void) | null = null;

	let isResultView = $derived.by(() => currentStep >= steps.length);
	const wordForScore = (value: number) => {
		if (!Number.isFinite(value)) return '';
		const index = Math.min(moodWords.length - 1, Math.max(0, Math.round(value) - 1));
		return moodWords[index];
	};

	let moodWord = $derived.by(() => wordForScore(moodScore));
	let waterCount = $derived.by(() => (waterGlasses ?? []).filter(Boolean).length);
	let waterTotal = $derived.by(() => waterGlasses?.length ?? 0);

	const formatDate = (value: string) => {
		const date = new Date(value);
		return date.toLocaleDateString('sv-SE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	};

	const formatScaleLabel = (value: number | null | undefined, labels: Record<number, string>) => {
		if (value === null || value === undefined) return '–';
		return labels[value] ?? '–';
	};

	const resetForm = (dateValue = today) => {
		currentStep = 0;
		entry = '';
		errorMessage = '';
		logDate = dateValue;
		selectedEvents = [];
		eventDetails = '';
		moodScore = 5;
		moodNote = '';
		moodEntries = [];
		moodAverage = null;
		moodManualOverride = false;
		hardMoments = '';
		helpfulMoments = '';
		ate = false;
		hydrated = false;
		outside = false;
		movement = false;
		rested = false;
		tookMedication = false;
		tone = 'grounded';
		dailyLog = null;
		autoError = '';
	};

	$effect(() => {
		if (open) {
			resetForm(initialDate ?? today);
		}
	});

	$effect(() => {
		const input = dateInput;
		const isOpen = open;

		if (!isOpen) {
			if (datePicker) {
				datePicker.destroy();
				datePicker = null;
			}
			return;
		}

		if (!input) return;

		const timeoutId = setTimeout(() => {
			if (!datePicker && input) {
				const initialDateValue = logDate || today;
				datePicker = flatpickr(input, {
					locale: Swedish,
					dateFormat: 'Y-m-d',
					altInput: true,
					altFormat: 'j F Y',
					maxDate: 'today',
					clickOpens: true,
					allowInput: false,
					static: true,
					showMonths: 1,
					defaultDate: initialDateValue,
					onChange: (selectedDates) => {
						if (selectedDates[0]) {
							const d = selectedDates[0];
							logDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
						}
					}
				});
			}
		}, 0);

		return () => clearTimeout(timeoutId);
	});

	$effect(() => {
		if (!open) return;
		logDate;
		void loadAutoData();
	});

	const loadAutoData = async () => {
		if (!logDate) return;
		autoLoading = true;
		autoError = '';
		moodManualOverride = false;
		try {
			const [entries, logs] = await Promise.all([
				getEntries(logDate, logDate),
				getDailyLogs({ date: logDate })
			]);

			moodEntries = entries ?? [];
			if (entries?.length) {
				const average = entries.reduce((sum, entry) => sum + entry.mood_level, 0) / entries.length;
				moodAverage = Number.isFinite(average) ? average : null;
				if (!moodManualOverride) {
					moodScore = Math.max(1, Math.min(10, average));
				}
			} else {
				moodAverage = null;
				if (!moodManualOverride) {
					moodScore = 5;
				}
			}
			dailyLog = logs?.[0] ?? null;
		} catch (err) {
			autoError = err instanceof Error ? err.message : 'Kunde inte hämta automatiska data.';
		} finally {
			autoLoading = false;
		}
	};

	const toggleEvent = (tag: string) => {
		if (selectedEvents.includes(tag)) {
			selectedEvents = selectedEvents.filter((item) => item !== tag);
		} else {
			selectedEvents = [...selectedEvents, tag];
		}
	};

	const handleMoodInput = () => {
		moodManualOverride = true;
	};

	const nextStep = () => {
		if (currentStep < steps.length - 1) {
			currentStep += 1;
		}
	};

	const prevStep = () => {
		if (currentStep > 0) {
			currentStep -= 1;
		}
	};

	const goToSummary = () => {
		currentStep = steps.length - 1;
	};

	const handleGenerate = async () => {
		isGenerating = true;
		errorMessage = '';

		const entriesArray = Array.isArray(moodEntries) ? [...moodEntries] : [];

		const payload = {
			date: logDate,
			events: selectedEvents,
			content: {
				details: eventDetails.trim()
			},
			mood: {
				score: moodScore,
				label: moodWord,
				note: moodNote.trim(),
				entryCount: entriesArray.length,
				average: moodAverage,
				entries: entriesArray.map((e) => ({
					mood_level: e.mood_level,
					note: e.note ?? '',
					timestamp: e.timestamp
				}))
			},
			dailyLog: dailyLog
				? {
						sleep_hours: dailyLog.sleep_hours,
						sleep_quality: dailyLog.sleep_quality,
						energy: dailyLog.energy,
						appetite: dailyLog.appetite,
						anxiety: dailyLog.anxiety,
						stress: dailyLog.stress,
						concentration: dailyLog.concentration
					}
				: null,
			hardMoments: hardMoments.trim(),
			helpfulMoments: helpfulMoments.trim(),
			basics: {
				ate,
				hydrated,
				outside,
				movement,
				rested,
				tookMedication
			},
			weather: {
				summary: weather.summary,
				location: weather.location,
				temperature: weather.temperature,
				resolvedKey: weather.resolvedKey,
				updatedAt: weather.updatedAt
			},
			water: {
				count: waterCount,
				total: waterTotal,
				any: waterCount > 0
			},
			breathingUsed,
			tone
		};

		try {
			const response = await generateDailyReflection(payload);
			entry = response?.entry ?? '';
			currentStep = steps.length;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Kunde inte skapa texten.';
		} finally {
			isGenerating = false;
		}
	};

	onMount(() => {
		unsubscribeWeather = weatherSnapshot.subscribe((value) => {
			weather = value;
		});
	});

	onDestroy(() => {
		if (datePicker) {
			datePicker.destroy();
		}
		if (unsubscribeWeather) {
			unsubscribeWeather();
		}
	});
</script>

{#if open}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		role="button"
		tabindex="0"
		onclick={() => dispatch('close')}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				dispatch('close');
			}
		}}
	>
	<div
			class="wizard-modal"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					dispatch('close');
				}
			}}
		>
			<header class="flex items-start justify-between gap-4 mb-4">
				<div class="flex items-start gap-3">
					<div class="icon-box icon-box-md">
						<i class="mi-ai-generate-text-spark text-lg icon-muted"></i>
					</div>
					<div>
						<h2 class="font-display text-xl" style="font-weight: 600;">
							Dagens reflektion
						</h2>
						<p class="text-sm text-base-content/60">
							En kort wizard som hjälper dig att sätta ord på dagen.
						</p>
					</div>
				</div>
				<button
					class="w-8 h-8 flex items-center justify-center rounded-md text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors"
					type="button"
					onclick={() => dispatch('close')}
					aria-label="Stäng"
				>
					<i class="mi-delete text-lg"></i>
				</button>
			</header>

			{#if !isResultView}
				<div class="wizard-progress">
					<div class="wizard-progress-steps">
						{#each steps as step, index}
							<button
								type="button"
								class={`wizard-step-icon ${currentStep === index ? 'is-active' : ''} ${currentStep > index ? 'is-complete' : ''}`}
								onclick={() => (currentStep = index)}
								aria-label={step.title}
								title={step.title}
							>
								<i class={`${stepIcons[index] ?? 'mi-number-one-circle'} wizard-step-glyph`} aria-hidden="true"></i>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if isResultView}
				<div class="entry-result">
					<article class="entry-paper">
						{#if entry}
							{#each entry.split('\n\n') as block, index}
								{#if block.trim()}
									{#if index === 0}
										<h3 class="entry-title">{block}</h3>
									{:else}
										<p class="entry-paragraph" class:is-first={index === 1}>{block}</p>
									{/if}
								{/if}
							{/each}
						{:else}
							<p class="text-sm text-base-content/60">Ingen text kunde skapas.</p>
						{/if}
					</article>
					<div class="entry-actions">
						<button class="btn btn-ghost" type="button" onclick={goToSummary}>
							<i class="mi-arrow-left" aria-hidden="true"></i>
							Tillbaka till sammanfattning
						</button>
					</div>
				</div>
			{:else}
				<div class="wizard-body">
					{#if currentStep === 0}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Vilket datum gäller det?</h3>
							<p class="wizard-hint">Förvalt är idag, men du kan gå tillbaka i tiden.</p>
							<div class="wizard-field">
								<label class="label text-sm" for="reflectionDate">Datum</label>
								<div class="relative">
									<i class="mi-calendar-mark text-base text-base-content/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"></i>
									<input
										bind:this={dateInput}
										id="reflectionDate"
										type="text"
										class="input input-bordered w-full pl-10"
										readonly
									/>
								</div>
							</div>

							<div class="wizard-data-status">
								<div class="wizard-data-status-header">
									<span>Data från valt datum</span>
								</div>
								{#if autoLoading}
									<p class="wizard-data-status-text">Hämtar...</p>
								{:else}
									<div class="wizard-data-status-grid">
										<span class="wizard-data-status-label">Humörloggar:</span>
										<span class="wizard-data-status-value">
											{#if moodEntries.length > 0}
												<span class="wizard-data-status-number">{moodEntries.length}</span>
												<span class="wizard-data-status-meta">(snitt {moodAverage?.toFixed(1) ?? '–'})</span>
											{:else}
												<span class="wizard-data-status-empty">–</span>
											{/if}
										</span>
										<span class="wizard-data-status-label">Daganteckning:</span>
										<span class="wizard-data-status-value">
											{#if dailyLog}
												<i class="mi-check wizard-data-status-check" aria-hidden="true"></i>
											{:else}
												<span class="wizard-data-status-empty">–</span>
											{/if}
										</span>
										<span class="wizard-data-status-label">Vattenintag:</span>
										<span class="wizard-data-status-value">
											{#if waterCount > 0}
												<span class="wizard-data-status-number">{waterCount}/{waterTotal}</span>
												<span class="wizard-data-status-meta">glas</span>
											{:else}
												<span class="wizard-data-status-empty">–</span>
											{/if}
										</span>
									</div>
									<p class="wizard-data-status-hint">
										Ju mer du loggat under dagen, desto rikare blir reflektionen.
									</p>
								{/if}
							</div>
						</section>
					{/if}

					{#if currentStep === 1}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Vad gjorde du idag?</h3>
							<p class="wizard-hint">Välj några ord och fyll på med egna detaljer.</p>
							<div class="wizard-pill-grid">
								{#each eventTags as tag}
									<button
										type="button"
										class={`wizard-pill ${selectedEvents.includes(tag) ? 'is-selected' : ''}`}
										onclick={() => toggleEvent(tag)}
									>
										{tag}
									</button>
								{/each}
							</div>
							<div class="wizard-field">
								<label class="label text-sm" for="reflectionEvents">Lägg till fria ord</label>
								<textarea
									id="reflectionEvents"
									class="textarea textarea-bordered w-full"
									rows="4"
									placeholder="Skriv fritt om dagen..."
									bind:value={eventDetails}
								></textarea>
							</div>
						</section>
					{/if}

					{#if currentStep === 2}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Hur mådde du idag?</h3>
							<p class="wizard-hint">
								Reglaget fylls automatiskt om det finns humörloggar för dagen.
							</p>
							<div class="mood-slider">
								<div class="mood-range-header">
									<span>Mitt humör</span>
									<span>{moodWord}</span>
								</div>
								<input
									type="range"
									min="1"
									max="10"
									step="0.01"
									bind:value={moodScore}
									oninput={handleMoodInput}
									class="mood-range"
								/>
							</div>
							<div class="wizard-field">
								<label class="label text-sm" for="reflectionMoodNote">Fri text om humör</label>
								<textarea
									id="reflectionMoodNote"
									class="textarea textarea-bordered w-full"
									rows="4"
									placeholder="Vad låg bakom känslan?"
									bind:value={moodNote}
								></textarea>
							</div>
						</section>
					{/if}

					{#if currentStep === 3}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Vad tog emot och vad hjälpte?</h3>
							<p class="wizard-hint">Valfritt, men ofta värdefullt för minnet.</p>
							<div class="wizard-field">
								<label class="label text-sm" for="reflectionHardMoments">Det som tog emot</label>
								<textarea
									id="reflectionHardMoments"
									class="textarea textarea-bordered w-full"
									rows="3"
									placeholder="Ex: svårt möte, trötthet..."
									bind:value={hardMoments}
								></textarea>
							</div>
							<div class="wizard-field">
								<label class="label text-sm" for="reflectionHelpfulMoments">Det som hjälpte</label>
								<textarea
									id="reflectionHelpfulMoments"
									class="textarea textarea-bordered w-full"
									rows="3"
									placeholder="Ex: en promenad, vila..."
									bind:value={helpfulMoments}
								></textarea>
							</div>
						</section>
					{/if}

					{#if currentStep === 4}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Fick du med grunderna?</h3>
							<p class="wizard-hint">Bocka i det som stämmer för dagen.</p>
							<div class="wizard-checkbox-grid">
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={ate} />
									<span>Åt ordentligt</span>
								</label>
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={hydrated} />
									<span>Drack tillräckligt</span>
								</label>
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={outside} />
									<span>Var utomhus</span>
								</label>
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={movement} />
									<span>Rörde på mig</span>
								</label>
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={rested} />
									<span>Vila när det behövdes</span>
								</label>
								<label class="wizard-checkbox">
									<input type="checkbox" bind:checked={tookMedication} />
									<span>Tog medicin</span>
								</label>
							</div>
						</section>
					{/if}

					{#if currentStep === 5}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Vilken ton vill du ha?</h3>
							<p class="wizard-hint">Välj hur texten ska kännas.</p>
							<div class="wizard-tone-list">
								<label class={`wizard-tone ${tone === 'grounded' ? 'is-selected' : ''}`}>
									<input type="radio" name="tone" value="grounded" bind:group={tone} />
									<span class="icon-box icon-box-md">
										<i class="mi-sprout text-lg icon-muted" aria-hidden="true"></i>
									</span>
									<span class="wizard-tone-content">
										<span class="wizard-tone-title">Jordnära</span>
										<span class="wizard-tone-desc">Saklig och ärlig, utan utsmyckning</span>
									</span>
								</label>
								<label class={`wizard-tone ${tone === 'warm' ? 'is-selected' : ''}`}>
									<input type="radio" name="tone" value="warm" bind:group={tone} />
									<span class="icon-box icon-box-md">
										<i class="mi-heart text-lg icon-muted" aria-hidden="true"></i>
									</span>
									<span class="wizard-tone-content">
										<span class="wizard-tone-title">Varm</span>
										<span class="wizard-tone-desc">Lite mjukare ton, fortfarande ärlig</span>
									</span>
								</label>
								<label class={`wizard-tone ${tone === 'minimal' ? 'is-selected' : ''}`}>
									<input type="radio" name="tone" value="minimal" bind:group={tone} />
									<span class="icon-box icon-box-md">
										<i class="mi-text-notes text-lg icon-muted" aria-hidden="true"></i>
									</span>
									<span class="wizard-tone-content">
										<span class="wizard-tone-title">Avskalad</span>
										<span class="wizard-tone-desc">Kortfattat, nästan telegramstil</span>
									</span>
								</label>
							</div>
						</section>
					{/if}

					{#if currentStep === 6}
						<section class="wizard-step-panel">
							<h3 class="wizard-title">Redo att sätta ord på dagen?</h3>
							<p class="wizard-hint">Granska sammanfattningen innan du skapar texten.</p>

							<div class="summary-card">
								<div class="summary-header">
									<span class="summary-date">{formatDate(logDate)}</span>
									{#if weather.summary || weather.location || weather.temperature !== null}
										<span class="summary-weather">
											{#if weather.temperature !== null}{weather.temperature}°C{/if}
											{#if weather.summary} {weather.summary}{/if}
											{#if weather.location} i {weather.location}{/if}
										</span>
									{/if}
								</div>

									<div class="summary-grid">
										<div>
											<span class="summary-label">Humör</span>
											<span class="summary-value">{moodWord}</span>
											{#if moodEntries.length > 0}
												<span class="summary-sub">
													{moodEntries.length} loggar, snitt {moodAverage?.toFixed(1)}
											</span>
										{/if}
									</div>
									<div>
										<span class="summary-label">Vatten</span>
										<span class="summary-value">
											{waterCount} av {waterTotal} glas
										</span>
									</div>
									<div>
										<span class="summary-label">Andning</span>
										<span class="summary-value">{breathingUsed ? 'Använt' : 'Inte använt'}</span>
									</div>
									<div>
										<span class="summary-label">Ton</span>
										<span class="summary-value">
											{tone === 'grounded' ? 'Jordnära' : tone === 'warm' ? 'Varm' : 'Avskalad'}
										</span>
									</div>
								</div>

								{#if selectedEvents.length > 0}
									<div class="summary-section">
										<span class="summary-label">Dagens innehåll</span>
										<div class="summary-tags">
											{#each selectedEvents as tag}
												<span class="summary-tag">{tag}</span>
											{/each}
										</div>
									</div>
								{/if}

								{#if dailyLog}
									<div class="summary-section">
										<span class="summary-label">Daganteckning</span>
										<div class="summary-list">
											<span>Ångest: {formatScaleLabel(dailyLog.anxiety, anxietyLabels)}</span>
											<span>Stress: {formatScaleLabel(dailyLog.stress, stressLabels)}</span>
											<span>Koncentration: {formatScaleLabel(dailyLog.concentration, concentrationLabels)}</span>
											<span>Energi: {formatScaleLabel(dailyLog.energy, energyLabels)}</span>
											<span>Aptit: {formatScaleLabel(dailyLog.appetite, appetiteLabels)}</span>
											<span>Sömn: {dailyLog.sleep_hours ?? '–'}h · {formatScaleLabel(dailyLog.sleep_quality, sleepQualityLabels)}</span>
										</div>
									</div>
								{/if}

								{#if ate || hydrated || outside || movement || rested || tookMedication}
									<div class="summary-section">
										<span class="summary-label">Grunderna</span>
										<div class="summary-tags">
											{#if ate}<span class="summary-tag">Åt</span>{/if}
											{#if hydrated}<span class="summary-tag">Drack</span>{/if}
											{#if outside}<span class="summary-tag">Ute</span>{/if}
											{#if movement}<span class="summary-tag">Rörelse</span>{/if}
											{#if rested}<span class="summary-tag">Vila</span>{/if}
											{#if tookMedication}<span class="summary-tag">Medicin</span>{/if}
										</div>
									</div>
								{/if}
							</div>

							{#if autoLoading}
								<p class="text-xs text-base-content/60 mt-3">Hämtar auto-data...</p>
							{:else if autoError}
								<p class="text-xs text-error mt-3">{autoError}</p>
							{/if}

							{#if errorMessage}
								<p class="text-sm text-error mt-4">{errorMessage}</p>
							{/if}
						</section>
					{/if}
				</div>

				<footer class="wizard-nav">
					<div>
						{#if currentStep > 0}
							<button type="button" class="btn btn-ghost" onclick={prevStep}>
								Tillbaka
							</button>
						{/if}
					</div>
					<div class="wizard-nav-right">
						{#if currentStep < steps.length - 1}
							<button type="button" class="btn btn-primary" onclick={nextStep}>
								Nästa
							</button>
						{:else}
							<button
								type="button"
								class="btn btn-primary"
								onclick={handleGenerate}
								disabled={isGenerating}
							>
								{#if isGenerating}
									Skriver...
								{:else}
									Sätt ord på dagen
								{/if}
							</button>
						{/if}
					</div>
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.wizard-modal {
		background: var(--color-base-100);
		border-radius: 0.75rem;
		width: 100%;
		max-width: 36rem;
		height: 620px;
		max-height: 92vh;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.wizard-modal > header {
		flex-shrink: 0;
	}

	.wizard-progress {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-shrink: 0;
	}

	.wizard-progress-steps {
		display: flex;
		width: 100%;
		padding: 0 0.6rem;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.wizard-step-icon {
		width: 2.85rem;
		height: 2.85rem;
		border-radius: 999px;
		display: grid;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--color-base-200) 70%, transparent);
		background: transparent;
		cursor: pointer;
		transition: border-color 150ms ease, background-color 150ms ease;
	}

	.wizard-step-icon.is-active {
		border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
	}

	.wizard-step-icon.is-complete {
		border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
	}

	.wizard-step-glyph {
		font-size: 1.6rem;
		color: var(--color-base-content);
		font-weight: 400;
	}

	.wizard-step-icon.is-active .wizard-step-glyph {
		font-weight: 500;
		color: var(--color-primary);
	}

	.wizard-step-icon.is-complete .wizard-step-glyph {
		font-weight: 700;
		color: var(--color-primary);
	}

	.wizard-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 0.25rem;
		margin: 0 -0.25rem;
	}

	.wizard-step-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.wizard-data-status {
		margin-top: 0.5rem;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-base-200) 40%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-base-300) 40%, transparent);
	}

	.wizard-data-status-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.85rem;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: color-mix(in srgb, var(--color-base-content) 50%, transparent);
	}

	.wizard-data-status-text {
		margin: 0;
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--color-base-content) 55%, transparent);
	}

	.wizard-data-status-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.35rem 1rem;
		align-items: center;
	}

	.wizard-data-status-label {
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
	}

	.wizard-data-status-value {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
	}

	.wizard-data-status-number {
		font-weight: 600;
		color: var(--color-primary);
	}

	.wizard-data-status-meta {
		color: color-mix(in srgb, var(--color-base-content) 50%, transparent);
	}

	.wizard-data-status-empty {
		color: color-mix(in srgb, var(--color-base-content) 35%, transparent);
	}

	.wizard-data-status-check {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.wizard-data-status-hint {
		margin: 0.85rem 0 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid color-mix(in srgb, var(--color-base-300) 35%, transparent);
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--color-base-content) 45%, transparent);
		line-height: 1.4;
	}

	.wizard-title {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.wizard-hint {
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
		font-size: 0.95rem;
	}

	.wizard-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.wizard-field textarea {
		resize: none;
		background: var(--color-base-100);
		border-radius: 0.375rem;
		border: 1px solid color-mix(in srgb, var(--color-base-300) 65%, transparent);
		box-shadow: none;
	}

	.wizard-field textarea:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
		outline-offset: 2px;
	}

	.wizard-pill-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.wizard-pill {
		font-weight: 400;
		padding: 0.2rem 0.45rem;
		border-radius: 0.4rem;
		border: 1px solid color-mix(in srgb, var(--color-base-300) 70%, transparent);
		font-size: 0.8rem;
		text-transform: none;
		background: transparent;
		cursor: pointer;
	}

	.wizard-pill.is-selected {
		background: color-mix(in srgb, var(--color-primary) 16%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
		color: var(--color-primary);
	}

	.mood-slider {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-base-200) 60%, transparent);
	}

	.mood-range-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.mood-range {
		width: 100%;
		-webkit-appearance: none;
		appearance: none;
		height: 2px;
		background: color-mix(in srgb, var(--color-base-300) 70%, transparent);
		border-radius: 999px;
		cursor: pointer;
	}

	.mood-range:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
		outline-offset: 4px;
	}

	.mood-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 999px;
		background: var(--color-primary);
		border: 2px solid var(--color-base-100);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	.mood-range::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 999px;
		background: var(--color-primary);
		border: 2px solid var(--color-base-100);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	.mood-range::-moz-range-track {
		height: 2px;
		background: color-mix(in srgb, var(--color-base-300) 70%, transparent);
		border-radius: 999px;
	}

	.wizard-checkbox-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem;
	}

	.wizard-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 0.85rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-base-200) 70%, transparent);
	}

	.wizard-checkbox input {
		appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.35rem;
		border: 1.5px solid color-mix(in srgb, var(--color-base-300) 80%, transparent);
		display: grid;
		place-items: center;
		background: var(--color-base-100);
	}

	.wizard-checkbox input::before {
		content: '';
		width: 0.45rem;
		height: 0.7rem;
		border-right: 2px solid var(--color-base-100);
		border-bottom: 2px solid var(--color-base-100);
		transform: rotate(45deg) scale(0);
		transform-origin: center;
		transition: transform 120ms ease;
	}

	.wizard-checkbox input:checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.wizard-checkbox input:checked::before {
		transform: rotate(45deg) scale(1);
	}

	.wizard-tone-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.wizard-tone {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem;
		border-radius: 0.375rem;
		border: 1px solid color-mix(in srgb, var(--color-base-200) 70%, transparent);
		cursor: pointer;
	}

	.wizard-tone input {
		display: none;
	}

	.wizard-tone.is-selected {
		border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}

	.wizard-tone-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.wizard-tone-title {
		font-weight: 600;
	}

	.wizard-tone-desc {
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
	}

	.summary-card {
		padding: 1.25rem;
		border-radius: 1rem;
		border: 1px solid color-mix(in srgb, var(--color-base-200) 80%, transparent);
		background: color-mix(in srgb, var(--color-base-100) 92%, transparent);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.summary-header {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.summary-date {
		font-weight: 600;
	}

	.summary-weather {
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--color-base-content) 60%, transparent);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
	}

	.summary-label {
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: color-mix(in srgb, var(--color-base-content) 45%, transparent);
	}

	.summary-value {
		display: block;
		font-weight: 600;
	}

	.summary-sub {
		display: block;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--color-base-content) 55%, transparent);
	}

	.summary-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.summary-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.summary-tag {
		padding: 0.3rem 0.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-base-200) 70%, transparent);
		font-size: 0.85rem;
	}

	.summary-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.4rem 1rem;
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--color-base-content) 70%, transparent);
	}

	.wizard-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.5rem;
		margin-top: auto;
		flex-shrink: 0;
	}

	.entry-result {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
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

	.entry-actions {
		margin-top: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.wizard-modal {
			height: auto;
			max-height: 92vh;
			min-height: 500px;
		}

		.entry-paper {
			padding: 1.5rem;
		}
	}
</style>
