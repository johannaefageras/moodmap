<script lang="ts">
	import flatpickr from 'flatpickr';
	import { Swedish } from 'flatpickr/dist/l10n/sv.js';
	import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import type { DailyLog, DailyLogChoice } from '$lib/types';
	import { upsertDailyLog } from '$lib/api/client';

interface Props {
	open?: boolean;
	initialLog?: DailyLog | null;
	initialDate?: string | null;
}

	let { open = false, initialLog = null, initialDate = null }: Props = $props();

	const dispatch = createEventDispatcher<{ close: void; saved: DailyLog }>();

	const today = new Date().toISOString().split('T')[0];

	let isSaving = $state(false);
	let errorMessage = $state('');

	let logDate = $state('');
	let dateInput: HTMLInputElement | null = $state(null);
	let dateAnchor: HTMLDivElement | null = $state(null);
	let datePicker: FlatpickrInstance | null = $state(null);
	let sleepHours = $state('');
	let sleepQuality = $state<number | null>(null);
	let energy = $state<number | null>(null);
	let appetite = $state<number | null>(null);
	let anxiety = $state<number | null>(null);
	let stress = $state<number | null>(null);
	let concentration = $state<number | null>(null);
	let exercise = $state<DailyLogChoice | null>(null);
	let social = $state<DailyLogChoice | null>(null);
	let daylight = $state<DailyLogChoice | null>(null);
	let alcohol = $state<DailyLogChoice | null>(null);
	let nicotine = $state<DailyLogChoice | null>(null);
	let otherSubstances = $state<DailyLogChoice | null>(null);
	let notes = $state('');

	const exerciseOptions = [
		{ value: 'none', label: 'Ingen' },
		{ value: 'light', label: 'Lätt' },
		{ value: 'moderate', label: 'Måttlig' },
		{ value: 'intense', label: 'Intensiv' }
	];

	const socialOptions = [
		{ value: 'none', label: 'Inga' },
		{ value: 'little', label: 'Lite' },
		{ value: 'some', label: 'En del' },
		{ value: 'lots', label: 'Mycket' }
	];

	const daylightOptions = [
		{ value: 'none', label: 'Inget' },
		{ value: 'little', label: 'Lite' },
		{ value: 'some', label: 'En del' },
		{ value: 'lots', label: 'Mycket' }
	];

	const substanceOptions = [
		{ value: 'none', label: 'Ingen' },
		{ value: 'light', label: 'Lite' },
		{ value: 'moderate', label: 'Måttligt' },
		{ value: 'heavy', label: 'Mycket' }
	];

	function resetForm() {
		logDate = initialLog?.date ?? initialDate ?? today;
		sleepHours = initialLog?.sleep_hours?.toString() ?? '';
		sleepQuality = initialLog?.sleep_quality ?? null;
		energy = initialLog?.energy ?? null;
		appetite = initialLog?.appetite ?? null;
		anxiety = initialLog?.anxiety ?? null;
		stress = initialLog?.stress ?? null;
		concentration = initialLog?.concentration ?? null;
		exercise = initialLog?.exercise ?? null;
		social = initialLog?.social ?? null;
		daylight = initialLog?.daylight ?? null;
		alcohol = initialLog?.alcohol ?? null;
		nicotine = initialLog?.nicotine ?? null;
		otherSubstances = initialLog?.other_substances ?? null;
		notes = initialLog?.notes ?? '';
		errorMessage = '';
	}

	$effect(() => {
		initialLog;
		initialDate;
		if (open) {
			resetForm();
		}
	});

	$effect(() => {
		const input = dateInput;
		const isOpen = open;
		// Capture logDate in the effect so we can use it for initialization
		const currentLogDate = logDate;

		if (!isOpen) {
			if (datePicker) {
				datePicker.destroy();
				datePicker = null;
			}
			return;
		}

		if (!input) return;

		const timeoutId = setTimeout(() => {
			const initialDateValue = currentLogDate || today;

			if (!datePicker && input) {
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
			} else if (datePicker && currentLogDate) {
				// If the picker already exists but the date changed, update it
				datePicker.setDate(currentLogDate, false);
			}
		}, 0);

		return () => clearTimeout(timeoutId);
	});

	onDestroy(() => {
		if (datePicker) {
			datePicker.destroy();
		}
	});

	function toggleNumber(current: number | null, next: number): number | null {
		return current === next ? null : next;
	}

	function toggleChoice(current: DailyLogChoice | null, next: DailyLogChoice): DailyLogChoice | null {
		return current === next ? null : next;
	}

	function toNumberOrNull(value: string | number | null | undefined): number | null {
		if (value === null || value === undefined) return null;
		if (typeof value === 'number') {
			return Number.isNaN(value) ? null : value;
		}
		const trimmed = value.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		return Number.isNaN(parsed) ? null : parsed;
	}

	async function handleSave() {
		isSaving = true;
		errorMessage = '';
		try {
			const payload = {
				date: logDate,
				sleep_hours: toNumberOrNull(sleepHours),
				sleep_quality: sleepQuality,
				energy,
				appetite,
				anxiety,
				stress,
				concentration,
				exercise,
				social,
				daylight,
				alcohol,
				nicotine,
				other_substances: otherSubstances,
				notes: notes.trim()
			};

			const saved = await upsertDailyLog(payload);
			dispatch('saved', saved);
			dispatch('close');
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Kunde inte spara daganteckningen.';
		} finally {
			isSaving = false;
		}
	}
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
			class="bg-base-100 rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
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
			<div class="flex items-start justify-between gap-4 mb-6">
				<div class="flex items-start gap-3">
					<i class="mi-notepad-text text-2xl text-base-content/70 mt-0.5"></i>
					<div>
						<h2 class="font-display text-xl" style="font-weight: 600;">Daganteckning</h2>
						<p class="text-sm text-base-content/60">Fyll i det som känns relevant för dagen.</p>
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
			</div>

			{#if errorMessage}
				<div class="mb-4 p-3 rounded-md bg-error/10 text-error text-sm">{errorMessage}</div>
			{/if}

			<div class="grid gap-5">
				<div class="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
					<label class="text-sm" style="font-weight: 500;" for="dailyLogDate">Datum</label>
					<div class="relative" bind:this={dateAnchor}>
						<i class="mi-calendar-mark text-base text-base-content/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"></i>
						<input
							type="text"
							id="dailyLogDate"
							class="input input-bordered w-full pl-10"
							bind:this={dateInput}
							readonly
						/>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
					<label class="text-sm" style="font-weight: 500;" for="dailyLogSleepHours">Sömntimmar</label>
					<input
						type="number"
						id="dailyLogSleepHours"
						inputmode="decimal"
						class="input input-bordered w-full"
						placeholder="t.ex. 7.5"
						step="0.5"
						min="0"
						max="24"
						bind:value={sleepHours}
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Sömnkvalitet</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										sleepQuality === value
											? 'bg-base-content text-base-100'
											: 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {sleepQuality === value ? 600 : 500};"
									onclick={() => (sleepQuality = toggleNumber(sleepQuality, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Mycket dålig</span>
							<span>Mycket bra</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Energi</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										energy === value ? 'bg-base-content text-base-100' : 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {energy === value ? 600 : 500};"
									onclick={() => (energy = toggleNumber(energy, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Mycket låg</span>
							<span>Mycket hög</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Aptit</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										appetite === value
											? 'bg-base-content text-base-100'
											: 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {appetite === value ? 600 : 500};"
									onclick={() => (appetite = toggleNumber(appetite, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Ingen aptit</span>
							<span>Mycket god aptit</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Ångest</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										anxiety === value ? 'bg-base-content text-base-100' : 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {anxiety === value ? 600 : 500};"
									onclick={() => (anxiety = toggleNumber(anxiety, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Ingen ångest</span>
							<span>Mycket stark</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Stress</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										stress === value ? 'bg-base-content text-base-100' : 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {stress === value ? 600 : 500};"
									onclick={() => (stress = toggleNumber(stress, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Ingen stress</span>
							<span>Mycket hög</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Koncentration</span>
					<div>
						<div class="flex gap-1">
							{#each [1, 2, 3, 4, 5] as value}
								<button
									type="button"
									class={`flex-1 py-2 rounded-md text-sm transition-all ${
										concentration === value
											? 'bg-base-content text-base-100'
											: 'bg-base-200 hover:bg-base-300'
									}`}
									style="font-weight: {concentration === value ? 600 : 500};"
									onclick={() => (concentration = toggleNumber(concentration, value))}
								>
									{value}
								</button>
							{/each}
						</div>
						<div class="flex justify-between text-xs text-base-content/50 mt-1">
							<span>Mycket dålig</span>
							<span>Mycket bra</span>
						</div>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Fysisk aktivitet</span>
					<div class="flex gap-1">
						{#each exerciseOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									exercise === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {exercise === option.value ? 600 : 500};"
								onclick={() => (exercise = toggleChoice(exercise, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Socialt</span>
					<div class="flex gap-1">
						{#each socialOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									social === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {social === option.value ? 600 : 500};"
								onclick={() => (social = toggleChoice(social, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Dagsljus</span>
					<div class="flex gap-1">
						{#each daylightOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									daylight === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {daylight === option.value ? 600 : 500};"
								onclick={() => (daylight = toggleChoice(daylight, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Alkohol</span>
					<div class="flex gap-1">
						{#each substanceOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									alcohol === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {alcohol === option.value ? 600 : 500};"
								onclick={() => (alcohol = toggleChoice(alcohol, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Nikotin</span>
					<div class="flex gap-1">
						{#each substanceOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									nicotine === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {nicotine === option.value ? 600 : 500};"
								onclick={() => (nicotine = toggleChoice(nicotine, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<span class="text-sm" style="font-weight: 500;">Droger</span>
					<div class="flex gap-1">
						{#each substanceOptions as option}
							<button
								type="button"
								class={`flex-1 py-2 rounded-md text-xs transition-all ${
									otherSubstances === option.value
										? 'bg-base-content text-base-100'
										: 'bg-base-200 hover:bg-base-300'
								}`}
								style="font-weight: {otherSubstances === option.value ? 600 : 500};"
								onclick={() => (otherSubstances = toggleChoice(otherSubstances, option.value))}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-[180px_1fr]">
					<label class="text-sm" style="font-weight: 500;" for="dailyLogNotes">Anteckningar</label>
					<textarea
						id="dailyLogNotes"
						class="textarea textarea-bordered w-full resize-none min-h-[120px]"
						placeholder="Skriv om dagen om du vill..."
						bind:value={notes}
					></textarea>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button class="btn btn-ghost flex items-center gap-1.5" type="button" onclick={() => dispatch('close')}>
					<i class="mi-delete text-base"></i>
					<span>Avbryt</span>
				</button>
				<button class="btn btn-primary flex items-center gap-1.5" type="button" onclick={handleSave} disabled={isSaving}>
					{#if isSaving}
						<i class="mi-loading-circle mi-is-spinning text-base"></i>
						<span>Sparar...</span>
					{:else}
						<i class="mi-save text-base"></i>
						<span>Spara</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
