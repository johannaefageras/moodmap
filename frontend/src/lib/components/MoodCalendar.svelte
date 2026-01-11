<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getDailyLogs, getDailyReflections, getEntries } from '$lib/api/client';
	import type { DailyLog, DailyReflection, MoodEntry } from '$lib/types';

	interface Props {
		refreshToken?: number;
	}

	let { refreshToken = 0 }: Props = $props();
	const dispatch = createEventDispatcher<{
		createEntry: { date: string };
		openDailyLog: { date: string };
		openDailyReflection: { date: string };
	}>();

	const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
	const MONTHS = [
		'Januari',
		'Februari',
		'Mars',
		'April',
		'Maj',
		'Juni',
		'Juli',
		'Augusti',
		'September',
		'Oktober',
		'November',
		'December'
	];

	const today = new Date();
	let currentDate = $state(new Date(today.getFullYear(), today.getMonth(), 1));
	let moodCounts = $state<Record<string, number>>({});
	let dailyLogDates = $state<Record<string, boolean>>({});
	let dailyReflectionDates = $state<Record<string, boolean>>({});
	let isLoading = $state(false);
	let selectedDate = $state<Date | null>(null);
	let popoverOpen = $state(false);

	const year = $derived(currentDate.getFullYear());
	const month = $derived(currentDate.getMonth());
	const daysInMonth = $derived(getDaysInMonth(year, month));
	const firstDayOfMonth = $derived(getFirstDayOfMonth(year, month));

	function getDaysInMonth(yearValue: number, monthValue: number): number {
		return new Date(yearValue, monthValue + 1, 0).getDate();
	}

	function getFirstDayOfMonth(yearValue: number, monthValue: number): number {
		const day = new Date(yearValue, monthValue, 1).getDay();
		return day === 0 ? 6 : day - 1;
	}

	function formatDateKey(yearValue: number, monthValue: number, day: number): string {
		return `${yearValue}-${String(monthValue + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function isSameDay(date1: Date, date2: Date): boolean {
		return (
			date1.getDate() === date2.getDate() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getFullYear() === date2.getFullYear()
		);
	}

	function formatSelectedDate(date: Date | null): string {
		if (!date) return '';
		return date.toLocaleDateString('sv-SE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	async function fetchCalendarData() {
		isLoading = true;
		const startDate = formatDateKey(year, month, 1);
		const endDate = formatDateKey(year, month, daysInMonth);

		try {
			const entriesResponse = await getEntries(startDate, endDate);
			const entries = Array.isArray(entriesResponse)
				? entriesResponse
				: (entriesResponse as { data?: MoodEntry[] })?.data ?? [];
			const counts: Record<string, number> = {};
			entries.forEach((entry: MoodEntry) => {
				const entryDate = new Date(entry.timestamp);
				const dateKey = formatDateKey(
					entryDate.getFullYear(),
					entryDate.getMonth(),
					entryDate.getDate()
				);
				counts[dateKey] = (counts[dateKey] || 0) + 1;
			});
			moodCounts = counts;

			const logsResponse = await getDailyLogs({ start_date: startDate, end_date: endDate });
			const logs = Array.isArray(logsResponse)
				? logsResponse
				: (logsResponse as { data?: DailyLog[] })?.data ?? [];
			const logDatesMap: Record<string, boolean> = {};
			logs.forEach((log: DailyLog) => {
				logDatesMap[log.date] = true;
			});
			dailyLogDates = logDatesMap;

			const reflectionsResponse = await getDailyReflections({ start_date: startDate, end_date: endDate });
			const reflections = Array.isArray(reflectionsResponse)
				? reflectionsResponse
				: (reflectionsResponse as { data?: DailyReflection[] })?.data ?? [];
			const reflectionDatesMap: Record<string, boolean> = {};
			reflections.forEach((reflection: DailyReflection) => {
				reflectionDatesMap[reflection.date] = true;
			});
			dailyReflectionDates = reflectionDatesMap;
		} catch (err) {
			console.error('Failed to fetch calendar data:', err);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		year;
		month;
		daysInMonth;
		refreshToken;
		fetchCalendarData();
	});

	function goToPrevMonth() {
		currentDate = new Date(year, month - 1, 1);
	}

	function goToNextMonth() {
		currentDate = new Date(year, month + 1, 1);
	}

	function goToToday() {
		currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
	}

	function handleDayClick(dayInfo: CalendarDay) {
		if (dayInfo.date > today || !dayInfo.isCurrentMonth) return;
		if (selectedDate && isSameDay(dayInfo.date, selectedDate) && popoverOpen) {
			popoverOpen = false;
			selectedDate = null;
			return;
		}
		selectedDate = dayInfo.date;
		popoverOpen = true;
	}

	function handleOpenMood(dayInfo: CalendarDay) {
		popoverOpen = false;
		selectedDate = null;
		dispatch('createEntry', { date: dayInfo.dateKey });
	}

	function handleOpenDailyLog(dayInfo: CalendarDay) {
		popoverOpen = false;
		selectedDate = null;
		dispatch('openDailyLog', { date: dayInfo.dateKey });
	}

	function handleOpenDailyReflection(dayInfo: CalendarDay) {
		popoverOpen = false;
		selectedDate = null;
		dispatch('openDailyReflection', { date: dayInfo.dateKey });
	}

	interface CalendarDay {
		day: number;
		isCurrentMonth: boolean;
		date: Date;
		dateKey: string;
	}

	const calendarDays = $derived.by<CalendarDay[]>(() => {
		const days: CalendarDay[] = [];
		const prevMonthDays = getDaysInMonth(year, month - 1);
		const prevMonthStartDay = prevMonthDays - firstDayOfMonth + 1;

		for (let i = 0; i < firstDayOfMonth; i += 1) {
			const day = prevMonthStartDay + i;
			days.push({
				day,
				isCurrentMonth: false,
				date: new Date(year, month - 1, day),
				dateKey: formatDateKey(year, month - 1, day)
			});
		}

		for (let day = 1; day <= daysInMonth; day += 1) {
			days.push({
				day,
				isCurrentMonth: true,
				date: new Date(year, month, day),
				dateKey: formatDateKey(year, month, day)
			});
		}

		const remainingInRow = days.length % 7;
		if (remainingInRow > 0) {
			const daysToAdd = 7 - remainingInRow;
			for (let day = 1; day <= daysToAdd; day += 1) {
				days.push({
					day,
					isCurrentMonth: false,
					date: new Date(year, month + 1, day),
					dateKey: formatDateKey(year, month + 1, day)
				});
			}
		}

		return days;
	});
</script>

<div class="border border-base-200 rounded-lg p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
		<div class="flex items-center gap-2">
			<i class="mi-calendar-mark text-xl text-base-content/60"></i>
			<h3 class="font-display text-lg" style="font-weight: 600;">{MONTHS[month]} {year}</h3>
		</div>
		<div class="flex items-center gap-1">
			<button class="btn btn-ghost btn-sm flex items-center gap-1" type="button" onclick={goToPrevMonth} aria-label="Föregående månad">
				<i class="mi-arrow-left text-base"></i>
			</button>
			<button class="btn btn-ghost btn-sm flex items-center gap-1" type="button" onclick={goToToday}>
				<span>Idag</span>
			</button>
			<button class="btn btn-ghost btn-sm flex items-center gap-1" type="button" onclick={goToNextMonth} aria-label="Nästa månad">
				<i class="mi-arrow-right text-base"></i>
			</button>
		</div>
	</div>

	<div class="grid grid-cols-7 mb-3 border-b pb-2">
		{#each WEEKDAYS as day}
			<div class="text-center text-sm text-base-content/60" style="font-weight: 600;">{day}</div>
		{/each}
	</div>

	{#if isLoading}
		<div class="h-48 flex items-center justify-center text-base-content/50">
			<i class="mi-loading-circle mi-is-spinning text-2xl mr-2"></i>
			<span>Laddar kalender...</span>
		</div>
	{:else}
		<div class="grid grid-cols-7 gap-2">
			{#each calendarDays as dayInfo}
				{#key dayInfo.dateKey}
					<div class="relative">
						<button
							type="button"
							onclick={() => handleDayClick(dayInfo)}
							disabled={dayInfo.date > today || !dayInfo.isCurrentMonth}
							class={`calendar-day-button relative aspect-square w-full flex flex-col items-center justify-start rounded-lg pt-1.5 transition-all duration-200 ${
								dayInfo.isCurrentMonth ? 'text-base-content' : 'text-base-content/30'
							} ${
								isSameDay(dayInfo.date, today) ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''
							} ${
								dayInfo.date > today || !dayInfo.isCurrentMonth
									? 'opacity-60 cursor-not-allowed'
									: 'hover:bg-base-200 cursor-pointer'
							} ${
								selectedDate && isSameDay(dayInfo.date, selectedDate) && popoverOpen
									? 'bg-base-200'
									: ''
							}`}
						>
							<span style="font-weight: {isSameDay(dayInfo.date, today) ? 600 : 400};" class={isSameDay(dayInfo.date, today) ? 'text-primary' : ''}>
								{dayInfo.day}
							</span>

							{#if dayInfo.isCurrentMonth && dayInfo.date <= today}
								<div class="calendar-indicator-row">
									{#if moodCounts[dayInfo.dateKey]}
										<span class="calendar-indicator calendar-indicator--mood" aria-label="Humörnoteringar">
											{moodCounts[dayInfo.dateKey]}
										</span>
									{/if}
									{#if dailyLogDates[dayInfo.dateKey]}
										<span class="calendar-indicator calendar-indicator--log" aria-label="Daganteckning">
											<i class="fmi mi-check" aria-hidden="true"></i>
										</span>
									{/if}
									{#if dailyReflectionDates[dayInfo.dateKey]}
										<span class="calendar-indicator calendar-indicator--reflection" aria-label="Dagreflektion">
											<i class="fmi mi-check" aria-hidden="true"></i>
										</span>
									{/if}
								</div>
							{/if}
						</button>

						{#if selectedDate && isSameDay(dayInfo.date, selectedDate) && popoverOpen}
							<div class="absolute z-20 top-12 left-1/2 -translate-x-1/2 w-52 rounded-lg border border-base-200 bg-base-100 shadow-lg p-3">
								<p class="text-sm capitalize text-center border-b pb-2" style="font-weight: 500;">
									{formatSelectedDate(selectedDate)}
								</p>
								<div class="mt-3 flex flex-col gap-2">
									<button
										class="btn btn-outline btn-sm justify-start flex items-center gap-2"
										onclick={() => handleOpenMood(dayInfo)}
									>
										<i class="mi-thermometer-positive text-sm"></i>
										<span>Nytt humör</span>
									</button>
									<button
										class="btn btn-outline btn-sm justify-start flex items-center gap-2"
										onclick={() => handleOpenDailyLog(dayInfo)}
									>
										<i class="mi-file-analytics text-sm"></i>
										<span>Daganteckning</span>
									</button>
									<button
										class="btn btn-outline btn-sm justify-start flex items-center gap-2"
										onclick={() => handleOpenDailyReflection(dayInfo)}
									>
										<i class="mi-ai-sparkles text-sm"></i>
										<span>Dagreflektion</span>
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/key}
			{/each}
		</div>
	{/if}

	<div class="mt-4 pt-3 border-t flex items-center justify-center gap-4 text-xs text-base-content/60">
		<div class="flex items-center gap-1.5">
			<span class="calendar-indicator calendar-indicator--mood calendar-indicator--legend" aria-hidden="true">
				<i class="mi-thermometer"></i>
			</span>
			<span>Humörnoteringar</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="calendar-indicator calendar-indicator--log calendar-indicator--legend" aria-hidden="true">
				<i class="mi-file-analytics"></i>
			</span>
			<span>Daganteckning</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="calendar-indicator calendar-indicator--reflection calendar-indicator--legend" aria-hidden="true">
				<i class="mi-ai-generate-text-spark"></i>
			</span>
			<span>Dagreflektion</span>
		</div>
	</div>
</div>

<style>
	.calendar-indicator-row {
		position: absolute;
		bottom: 0.3rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}

	.calendar-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.2rem;
		height: 1.2rem;
		padding: 0;
		border-radius: 999px;
		font-size: 0.6rem;
		font-weight: 600;
		line-height: 1;
	}

	.calendar-indicator i {
		font-size: inherit;
		line-height: 1;
	}

	.calendar-indicator--legend {
		min-width: 1.75rem;
		height: 1.75rem;
		padding: 0 0.45rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	:global([data-theme='light']) .calendar-indicator--mood {
		background-color: #f6c6d1;
		color: #9b2f53;
	}

	:global([data-theme='dark']) .calendar-indicator--mood {
		background-color: #4a2232;
		color: #f3a7c1;
	}

	:global([data-theme='light']) .calendar-indicator--log {
		background-color: #bfe9d3;
		color: #1f7a55;
	}

	:global([data-theme='dark']) .calendar-indicator--log {
		background-color: #1e3a2f;
		color: #7fe0b1;
	}

	:global([data-theme='light']) .calendar-indicator--reflection {
		background-color: color-mix(in srgb, var(--color-primary) 25%, #ffffff);
		color: #1f5e76;
	}

	:global([data-theme='dark']) .calendar-indicator--reflection {
		background-color: color-mix(in srgb, var(--color-primary) 25%, #0f141c);
		color: #93d3ea;
	}

	.calendar-day-button {
		border: 0;
		background: transparent;
		padding: 0;
		text-align: inherit;
	}
</style>
