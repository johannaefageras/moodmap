<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { reflectionDialog } from '$lib/stores/reflectionDialog';
	import MoodChart from '$lib/components/MoodChart.svelte';
	import DailyLogDialog from '$lib/components/DailyLogDialog.svelte';
	import MoodCalendar from '$lib/components/MoodCalendar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import flatpickr from 'flatpickr';
	import { Swedish } from 'flatpickr/dist/l10n/sv.js';
	import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
	import { createEntry, getDailyLogToday, getDailyLogs, getGraphData } from '$lib/api/client';
	import type { DailyLog, GraphView } from '$lib/types';
	import { onDestroy, onMount, tick } from 'svelte';

	let moodValue = $state(5);
	let activeView = $state<GraphView>('day');
	let graphData = $state<any[]>([]);
	let isLoading = $state(false);
	let hasInitialized = $state(false);

	const moodLabels: Record<number, string> = {
		1: 'På botten',
		2: 'Tungt',
		3: 'Jobbigt',
		4: 'Lite lågt',
		5: 'Varken eller',
		6: 'Helt okej',
		7: 'Stabilt',
		8: 'Bara bra',
		9: 'Jättebra',
		10: 'Strålande'
	};

	const viewTitles: Record<string, { title: string; subtitle: string }> = {
		day: { title: 'Dagsöversikt', subtitle: 'Noteringar från idag' },
		week: { title: 'Senaste veckan', subtitle: 'Dagliga genomsnitt de senaste 7 dagarna' },
		month: { title: 'Denna månad', subtitle: 'Dagliga genomsnitt för hela månaden' },
		year: { title: 'Årsöversikt', subtitle: 'Månadsgenomsnitt för hela året' }
	};

	let showNewEntry = $state(false);
	let entryNote = $state('');
	let isSaving = $state(false);
	let entryDate = $state<Date | null>(null);
	let entryDateInput: HTMLInputElement | null = $state(null);
	let entryDateAnchor: HTMLDivElement | null = $state(null);
	let entryDatePicker: FlatpickrInstance | null = $state(null);
	let showDailyLog = $state(false);
	let dailyLog = $state<DailyLog | null>(null);
	let dailyLogExists = $state(false);
	let dailyLogLoading = $state(false);
	let dailyLogError = $state('');
	let dailyLogDialogDate = $state<string | null>(null);
	let dailyLogDialogLog = $state<DailyLog | null>(null);
	let calendarRefresh = $state(0);

	const exerciseLabels: Record<string, string> = {
		none: 'Ingen',
		light: 'Lätt',
		moderate: 'Måttlig',
		intense: 'Intensiv'
	};

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

	const socialLabels: Record<string, string> = {
		none: 'Inga',
		little: 'Lite',
		some: 'En del',
		lots: 'Mycket'
	};

	const daylightLabels: Record<string, string> = {
		none: 'Inget',
		little: 'Lite',
		some: 'En del',
		lots: 'Mycket'
	};

	const substanceLabels: Record<string, string> = {
		none: 'Inget',
		light: 'Lite',
		moderate: 'Måttligt',
		heavy: 'Mycket'
	};

	function formatChoice(value: string | null | undefined, labels: Record<string, string>): string {
		if (!value) return '–';
		return labels[value] ?? value;
	}

	function formatScaleLabel(
		value: number | null | undefined,
		labels: Record<number, string>
	): string {
		if (value === null || value === undefined) return '–';
		return labels[value] ?? '–';
	}

	async function fetchGraphData() {
		console.log('fetchGraphData called, view:', activeView);
		isLoading = true;
		try {
			const data = await getGraphData(activeView);
			console.log('Graph data received:', data);
			graphData = data || [];
		} catch (err) {
			console.error('Failed to fetch graph data:', err);
			graphData = [];
		} finally {
			isLoading = false;
		}
	}

	async function fetchDailyLog() {
		dailyLogLoading = true;
		dailyLogError = '';
		try {
			const response = await getDailyLogToday();
			if ('exists' in response) {
				dailyLog = null;
				dailyLogExists = false;
			} else {
				dailyLog = response;
				dailyLogExists = true;
			}
		} catch (err) {
			console.error('Failed to fetch daily log:', err);
			dailyLogError = err instanceof Error ? err.message : 'Kunde inte hämta daganteckningen.';
		} finally {
			dailyLogLoading = false;
		}
	}

	async function handleSaveEntry() {
		isSaving = true;
		try {
			const now = new Date();
			const safeDate = entryDate && entryDate > now ? now : entryDate;
			await createEntry({
				mood_level: moodValue,
				note: entryNote || undefined,
				timestamp: safeDate ? safeDate.toISOString() : undefined
			});
			showNewEntry = false;
			entryNote = '';
			moodValue = 5;
			entryDate = null;
			await fetchGraphData();
			calendarRefresh += 1;
		} catch (err) {
			console.error('Failed to save entry:', err);
		} finally {
			isSaving = false;
		}
	}

	function handleDailyLogSaved(event: CustomEvent<DailyLog>) {
		const savedLog = event.detail;
		if (savedLog.date === new Date().toISOString().split('T')[0]) {
			dailyLog = savedLog;
			dailyLogExists = true;
		}
		dailyLogDialogLog = savedLog;
		calendarRefresh += 1;
	}

	function openNewEntry(date?: string) {
		if (date) {
			const now = new Date();
			const hours = String(now.getHours()).padStart(2, '0');
			const minutes = String(now.getMinutes()).padStart(2, '0');
			entryDate = new Date(`${date}T${hours}:${minutes}:00`);
		} else {
			entryDate = new Date();
		}
		showNewEntry = true;
	}

	async function openDailyLog(date?: string) {
		const targetDate = date ?? new Date().toISOString().split('T')[0];
		dailyLogDialogDate = targetDate;
		dailyLogDialogLog = null;
		showDailyLog = true;
		try {
			const logs = await getDailyLogs({ date: targetDate });
			dailyLogDialogLog = logs[0] ?? null;
		} catch (err) {
			console.error('Failed to fetch daily log:', err);
		}
	}

	$effect(() => {
		// Watch both showNewEntry state and entryDateInput binding
		const input = entryDateInput;
		const isOpen = showNewEntry;
		// Capture entryDate in the effect so we can use it for initialization
		const currentEntryDate = entryDate;

		if (!isOpen) {
			if (entryDatePicker) {
				entryDatePicker.destroy();
				entryDatePicker = null;
			}
			return;
		}

		if (!input) return;

		// Use setTimeout to ensure DOM is fully ready
		const timeoutId = setTimeout(() => {
			const maxDay = new Date();
			maxDay.setHours(23, 59, 59, 999);

			if (!entryDatePicker && input) {
				entryDatePicker = flatpickr(input, {
					locale: Swedish,
					enableTime: true,
					time_24hr: true,
					dateFormat: 'Y-m-d H:i',
					altInput: true,
					altFormat: 'j F Y H:i',
					maxDate: maxDay,
					clickOpens: true,
					allowInput: false,
					static: true,
					showMonths: 1,
					defaultDate: currentEntryDate ?? new Date(),
					onChange: (selectedDates) => {
						entryDate = selectedDates[0] ?? null;
					}
				});
			} else if (entryDatePicker && currentEntryDate) {
				// If the picker already exists but the date changed, update it
				entryDatePicker.setDate(currentEntryDate, false);
			}
		}, 0);

		return () => clearTimeout(timeoutId);
	});

	onDestroy(() => {
		if (entryDatePicker) {
			entryDatePicker.destroy();
		}
	});

	function handleViewChange(view: GraphView) {
		activeView = view;
		if ($auth.user) {
			fetchGraphData();
		}
	}

	onMount(() => {
		hasInitialized = true;
	});

	// Initial fetch when user is available
	$effect(() => {
		if (!hasInitialized || $auth.loading) return;
		if ($auth.user) {
			console.log('Effect triggered - fetching data');
			fetchGraphData();
			fetchDailyLog();
		} else {
			dailyLog = null;
			dailyLogExists = false;
		}
	});
</script>

<svelte:head>
	<title>Moodmap</title>
</svelte:head>

<div class="flex flex-col xl:flex-row xl:gap-12">
	<!-- Main content -->
	<main class="flex-1 min-w-0">
		<!-- Section heading -->
		<div class="mb-4">
			<h2>{viewTitles[activeView].title}</h2>
			<p class="text-base-content/60 text-sm">{viewTitles[activeView].subtitle}</p>
		</div>

		<!-- View tabs + new entry button -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
			<div class="flex gap-1 text-sm icon-box-bg p-1 rounded-lg w-fit">
				{#each (['day', 'week', 'month', 'year'] as const) as view}
					<button
						class="px-3 py-1.5 rounded-md transition-colors {activeView === view
							? 'bg-base-100'
							: 'text-base-content/60 hover:text-base-content'}"
						style={activeView === view ? "font-weight: 600;" : ""}
						onclick={() => handleViewChange(view)}
					>
						{view === 'day' ? 'Dag' : view === 'week' ? 'Vecka' : view === 'month' ? 'Månad' : 'År'}
					</button>
				{/each}
			</div>

			{#if $auth.user}
				<button
					class="group px-4 py-2 border border-base-300 rounded-md text-sm hover:bg-base-200 transition-colors w-fit flex items-center gap-2"
					style="font-weight: 500;"
					onclick={() => openNewEntry()}
				>
					<i class="mi-thermometer-positive text-base icon-hover"></i>
					Nytt humör
				</button>
			{/if}
		</div>

		<!-- Chart -->
		{#if $auth.loading}
			<div class="h-80 border border-base-200 rounded-lg flex items-center justify-center">
				<div class="flex items-center gap-2 text-base-content/40">
					<i class="mi-loading-circle mi-is-spinning text-2xl"></i>
					<span>Laddar användare...</span>
				</div>
			</div>
		{:else if !$auth.user}
			<div class="h-80 border border-base-200 rounded-lg flex flex-col items-center justify-center text-center p-8">
				<div class="icon-box icon-box-lg mb-4">
					<i class="mi-graph-curve icon-muted icon-hover"></i>
				</div>
				<p class="text-base-content/40 mb-4">
					Logga in för att se din humörgraf
				</p>
				<a href="/login" class="px-4 py-2 bg-base-content text-base-100 rounded-md text-sm hover:bg-base-content/90 transition-colors flex items-center gap-2" style="font-weight: 600;">
					<i class="mi-login-3 text-base"></i>
					<span>Logga in</span>
				</a>
			</div>
		{:else}
			<MoodChart data={graphData} view={activeView} {isLoading} />
		{/if}

		<!-- Daily Summary Section -->
		<div class="mt-12 mb-12">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
				<div>
					<h2>Sammanfattning</h2>
					<p class="text-base-content/60 text-sm">
						{#if $auth.user}
							{#if dailyLogLoading}
								Hämtar daganteckning...
							{:else if dailyLogExists}
								Dagens daganteckning är sparad.
							{:else}
								Ingen daganteckning ännu. Vill du lägga till en?
							{/if}
						{:else}
							Logga in för att använda daganteckningar.
						{/if}
					</p>
				</div>
				{#if $auth.user}
				<button
				class="px-4 py-2 border border-base-300 rounded-md text-sm hover:bg-base-200 transition-colors w-fit flex items-center gap-2"
				style="font-weight: 500;"
				onclick={() => openDailyLog(dailyLog?.date)}
				>
				<i class="mi-{dailyLogExists ? 'pencil' : 'notepad-text'} text-base"></i>
				 <span>{dailyLogExists ? 'Redigera daganteckning' : 'Daganteckning'}</span>
				 </button>
			{/if}
			</div>

			<div class="border border-base-200 rounded-lg p-6">
				{#if !$auth.user}
					<div class="text-center text-base-content/40">Logga in för att se din sammanfattning.</div>
				{:else if dailyLogLoading}
					<div class="text-center text-base-content/40 flex items-center justify-center gap-2">
						<i class="mi-loading-circle mi-is-spinning text-lg"></i>
						<span>Laddar daganteckning...</span>
					</div>
				{:else if dailyLogError}
					<div class="text-center text-error flex items-center justify-center gap-2">
						<i class="mi-alert-circle text-lg"></i>
						<span>{dailyLogError}</span>
					</div>
				{:else if dailyLogExists && dailyLog}
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
						<!-- Fysiskt -->
						<div>
							<h3 class="section-header">Fysiskt</h3>
							<div class="space-y-4">
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-bed text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Sömn</p>
										<p class="text-sm" style="font-weight: 500;">
											{dailyLog.sleep_hours ?? '–'} h ({formatScaleLabel(dailyLog.sleep_quality, sleepQualityLabels)})
										</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-bolt-2 text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Energi</p>
										<p class="text-sm" style="font-weight: 500;">
											{formatScaleLabel(dailyLog.energy, energyLabels)}
										</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-fork-plate text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Aptit</p>
										<p class="text-sm" style="font-weight: 500;">
											{formatScaleLabel(dailyLog.appetite, appetiteLabels)}
										</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Mentalt -->
						<div>
							<h3 class="section-header">Mentalt</h3>
							<div class="space-y-4">
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-brain text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Ångest</p>
										<p class="text-sm" style="font-weight: 500;">
											{formatScaleLabel(dailyLog.anxiety, anxietyLabels)}
										</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-mental-disorder text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Stress</p>
										<p class="text-sm" style="font-weight: 500;">
											{formatScaleLabel(dailyLog.stress, stressLabels)}
										</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-focus text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Koncentration</p>
										<p class="text-sm" style="font-weight: 500;">
											{formatScaleLabel(dailyLog.concentration, concentrationLabels)}
										</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Aktiviteter -->
						<div>
							<h3 class="section-header">Aktiviteter</h3>
							<div class="space-y-4">
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-man-standing-2 text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Träning</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.exercise, exerciseLabels)}</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-users-circle text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Socialt</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.social, socialLabels)}</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-sunset-2 text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Dagsljus</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.daylight, daylightLabels)}</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Substanser -->
						<div>
							<h3 class="section-header">Substanser</h3>
							<div class="space-y-4">
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-alcohol text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Alkohol</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.alcohol, substanceLabels)}</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-smoking text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Nikotin</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.nicotine, substanceLabels)}</p>
									</div>
								</div>
								<div class="stat-item group">
									<div class="icon-box icon-box-lg">
										<i class="mi-cannabis text-[1.75rem] icon-muted icon-hover"></i>
									</div>
									<div class="min-w-0">
										<p class="text-sm text-base-content/60">Droger</p>
										<p class="text-sm" style="font-weight: 500;">{formatChoice(dailyLog.other_substances, substanceLabels)}</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Notes -->
					{#if dailyLog.notes?.trim()}
					<div class="mt-6 pt-5 border-t border-base-200">
						<h3 class="section-header">Anteckningar</h3>
						<p class="text-base leading-relaxed">{dailyLog.notes}</p>
					</div>
					{/if}
				{:else}
					<div class="text-center text-base-content/40 py-4">
						<i class="mi-notepad-text text-4xl mb-3 block"></i>
						Klicka på "Daganteckning" för att fylla i dagens sammanfattning.
					</div>
				{/if}
			</div>
		</div>

		<!-- Calendar Section -->
		<div class="mb-12">
			<div class="mb-4 flex items-start gap-3">
				<div>
					<h2>Kalender</h2>
					<p class="text-base-content/60 text-sm">Översikt över ditt humör dag för dag</p>
				</div>
			</div>

			{#if $auth.user}
				<MoodCalendar
					refreshToken={calendarRefresh}
					on:createEntry={(event) => openNewEntry(event.detail.date)}
					on:openDailyLog={(event) => openDailyLog(event.detail.date)}
					on:openDailyReflection={(event) => reflectionDialog.open(event.detail.date)}
				/>
			{:else}
				<div class="border border-base-200 rounded-lg p-6 h-64 flex items-center justify-center text-base-content/40">
					Logga in för att se din kalender.
				</div>
			{/if}
		</div>

	</main>

	<Sidebar />
</div>

<!-- New Entry Modal -->
{#if showNewEntry}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		role="button"
		tabindex="0"
		onclick={() => showNewEntry = false}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				showNewEntry = false;
			}
		}}
	>
		<div
			class="bg-base-100 rounded-lg w-full max-w-md p-6"
			role="dialog"
			aria-modal="true"
			tabindex="0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					showNewEntry = false;
				}
			}}
		>
			<div class="flex items-center gap-2 mb-1">
				<i class="mi-clipboard-heart-rate text-2xl text-base-content/80"></i>
				<h2 class="font-display text-xl" style="font-weight: 600;">Hur mår du just nu?</h2>
			</div>
			<p class="text-sm text-base-content/60 mb-6">Det tar under 10 sekunder.</p>

			<!-- Mood display -->
			<div class="text-center mb-6">
				<div class="font-display text-5xl mb-2" style="font-weight: 600;">{moodValue}</div>
				<div class="text-base-content/60">{moodLabels[moodValue]}</div>
			</div>

			<!-- Mood buttons -->
			<div class="flex gap-1 mb-6">
				{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as value}
					<button
						class="flex-1 aspect-square rounded-lg text-sm transition-all {moodValue === value
							? 'bg-base-content text-base-100 scale-110'
							: 'bg-base-200 hover:bg-base-300'}"
						style="font-weight: {moodValue === value ? 600 : 500};"
						onclick={() => moodValue = value}
					>
						{value}
					</button>
				{/each}
			</div>

			<!-- Note -->
			<div class="mb-6">
				<label class="block text-sm mb-2 flex items-center gap-2" style="font-weight: 500;" for="entryDate">
					<span>Datum</span>
				</label>
				<div class="relative mb-4" bind:this={entryDateAnchor}>
					<i class="mi-calendar-mark text-base text-base-content/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"></i>
					<input
						type="text"
						id="entryDate"
						class="w-full pl-10 pr-3 py-2 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40 text-sm"
						bind:this={entryDateInput}
						readonly
						/>
						</div>

						<label class="block text-sm mb-2 flex items-center gap-2" style="font-weight: 500;" for="entryNote">
					<span>Valfri anteckning</span>
				</label>
				<textarea
					id="entryNote"
					bind:value={entryNote}
					placeholder="Vad händer just nu?"
					class="w-full px-3 py-2 border border-base-300 rounded-md bg-base-100 focus:outline-none focus:border-base-content/40 resize-none h-20 text-sm"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<button
					class="px-4 py-2 text-sm text-base-content/60 hover:text-base-content flex items-center gap-1.5 transition-colors"
					onclick={() => showNewEntry = false}
				>
					<i class="mi-delete text-base"></i>
					<span>Avbryt</span>
				</button>
				<button
					class="px-4 py-2 bg-base-content text-base-100 rounded-md text-sm disabled:opacity-50 hover:bg-base-content/90 transition-colors flex items-center gap-2"
					style="font-weight: 600;"
					onclick={handleSaveEntry}
					disabled={isSaving}
				>
					{#if isSaving}
						<i class="mi-loading-circle mi-is-spinning text-base"></i>
					{:else}
						<i class="mi-save text-base"></i>
					{/if}
					<span>{isSaving ? 'Sparar...' : 'Spara'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}

	<DailyLogDialog
		open={showDailyLog}
		initialLog={dailyLogDialogLog ?? dailyLog}
		initialDate={dailyLogDialogDate}
		on:close={() => (showDailyLog = false)}
		on:saved={handleDailyLogSaved}
	/>
