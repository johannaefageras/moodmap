<script lang="ts">
	interface DataPoint {
		date: string;
		average_mood: number;
		entry_count?: number;
		time?: string;
		month?: string;
	}

	interface Props {
		data: DataPoint[] | { data: DataPoint[] } | null;
		view: 'day' | 'week' | 'month' | 'year';
		isLoading?: boolean;
	}

	let { data = [], view = 'week', isLoading = false }: Props = $props();

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

	function formatDate(dateStr: string, viewType: string, timeStr?: string): string {
		if (viewType === 'day' && timeStr) {
			return timeStr;
		}
		const date = new Date(dateStr);
		if (viewType === 'year') {
			return date.toLocaleDateString('sv-SE', { month: 'short' }).replace('.', '');
		}
		if (viewType === 'month') {
			return date.getDate().toString();
		}
		return date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric' });
	}

	// Handle both array and { data: array } response formats
	let normalizedData = $derived.by(() => {
		if (!data) return [];
		if (Array.isArray(data)) return data;
		if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
			return data.data;
		}
		return [];
	});

	let chartData = $derived(
		normalizedData.map((item) => ({
			label: formatDate(item.date || item.month || '', view, item.time),
			value: parseFloat(String(item.average_mood)),
			entries: item.entry_count || 0
		}))
	);

	// Chart dimensions
	const padding = { top: 20, right: 20, bottom: 40, left: 40 };
	const width = 800;
	const height = 300;
	const innerWidth = width - padding.left - padding.right;
	const innerHeight = height - padding.top - padding.bottom;

	// Scales
	let xScale = $derived((index: number) => {
		if (chartData.length <= 1) return innerWidth / 2;
		return (index / (chartData.length - 1)) * innerWidth;
	});

	let yScale = $derived((value: number) => {
		return innerHeight - ((value - 1) / 9) * innerHeight;
	});

	// Generate path
	let linePath = $derived.by(() => {
		if (chartData.length === 0) return '';
		return chartData
			.map((d, i) => {
				const x = xScale(i);
				const y = yScale(d.value);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	});

	// Generate area path
	let areaPath = $derived.by(() => {
		if (chartData.length === 0) return '';
		const line = chartData
			.map((d, i) => {
				const x = xScale(i);
				const y = yScale(d.value);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
		const bottomRight = `L ${xScale(chartData.length - 1)} ${innerHeight}`;
		const bottomLeft = `L ${xScale(0)} ${innerHeight}`;
		return `${line} ${bottomRight} ${bottomLeft} Z`;
	});

	// Tooltip state
	let hoveredIndex = $state<number | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);
</script>

{#if isLoading}
	<div class="h-80 border border-base-200 rounded-lg flex items-center justify-center">
		<div class="flex items-center gap-2 text-base-content/40">
			<i class="mi-loading-circle mi-is-spinning text-2xl"></i>
			<span>Laddar...</span>
		</div>
	</div>
{:else if chartData.length === 0}
	<div class="h-80 border border-base-200 rounded-lg flex flex-col items-center justify-center text-center p-8">
		<div class="icon-box icon-box-lg mb-4">
			<i class="mi-graph-curve icon-muted icon-hover"></i>
		</div>
		<p class="text-base-content/40">
			Ingen data än. Logga ditt första humör för att se grafen!
		</p>
	</div>
{:else}
	<div class="border border-base-200 rounded-lg p-4 relative">
		<svg viewBox="0 0 {width} {height}" class="w-full h-auto" style="max-height: 320px; font-family: var(--font-sans);">
			<g transform="translate({padding.left}, {padding.top})">
				<!-- Grid lines -->
				{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as tick}
					<line
						x1="0"
						y1={yScale(tick)}
						x2={innerWidth}
						y2={yScale(tick)}
						class="stroke-base-200"
						stroke-width="1"
					/>
				{/each}

				<!-- Y-axis labels -->
				{#each [2, 4, 6, 8, 10] as tick}
					<text
						x="-10"
						y={yScale(tick)}
						class="fill-base-content/40"
						style="font-size: 12px; font-weight: 500;"
						text-anchor="end"
						dominant-baseline="middle"
					>
						{tick}
					</text>
				{/each}

				<!-- X-axis labels -->
				{#each chartData as point, i}
					{#if chartData.length <= 10 || i % Math.ceil(chartData.length / 10) === 0}
						<text
							x={xScale(i)}
							y={innerHeight + 25}
							class="fill-base-content/40"
							style="font-size: 12px; font-weight: 400;"
							text-anchor="middle"
						>
							{point.label}
						</text>
					{/if}
				{/each}

				<!-- Area -->
				<path
					d={areaPath}
					class="fill-primary/10"
				/>

				<!-- Line -->
				<path
					d={linePath}
					fill="none"
					class="stroke-primary"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				<!-- Data points -->
				{#each chartData as point, i}
					<circle
						cx={xScale(i)}
						cy={yScale(point.value)}
						r={hoveredIndex === i ? 6 : 4}
						class="fill-primary stroke-base-100 cursor-pointer transition-all"
						stroke-width="2"
						onmouseenter={(e) => {
							hoveredIndex = i;
							const rect = (e.target as SVGCircleElement).getBoundingClientRect();
							tooltipX = rect.left + rect.width / 2;
							tooltipY = rect.top;
						}}
						onmouseleave={() => hoveredIndex = null}
					/>
				{/each}
			</g>
		</svg>

		<!-- Tooltip -->
		{#if hoveredIndex !== null}
			{@const point = chartData[hoveredIndex]}
			{@const roundedValue = Math.round(point.value)}
			<div
				class="fixed z-50 bg-base-100 border border-base-200 rounded-lg shadow-lg p-3 text-center pointer-events-none"
				style="left: {tooltipX}px; top: {tooltipY}px; transform: translate(-50%, -100%) translateY(-8px);"
			>
				<div class="text-xs text-base-content/60 mb-1">{point.label}</div>
				<div class="font-display text-xl" style="font-weight: 600;">{point.value.toFixed(1)}</div>
				<div class="text-xs text-base-content/60">{moodLabels[roundedValue]}</div>
				{#if point.entries > 0}
					<div class="text-xs text-base-content/40 mt-1">
						{point.entries} {point.entries === 1 ? 'notering' : 'noteringar'}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
