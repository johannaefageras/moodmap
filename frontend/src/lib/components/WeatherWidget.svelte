<script lang="ts">
	import { onMount } from 'svelte';
	import * as SunCalc from 'suncalc';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import { resolveFromSmhi } from '$lib/weather/resolveWeather';
	import { resolveSvgIcon } from '$lib/weather/resolveSvgIcon';
	import weatherMoods from '$lib/weather/weather-moods.json';
	import { weatherSnapshot } from '$lib/stores/weatherSnapshot';

	const SMHI_ENDPOINT = '/smhi';

	const WEATHER_SUMMARIES: Record<number, { label: string; summary: string }> = {
		1: { label: 'Klart', summary: 'klart' },
		2: { label: 'Nästan klart', summary: 'nästan klart' },
		3: { label: 'Växlande molnighet', summary: 'växlande molnighet' },
		4: { label: 'Halvklart', summary: 'halvklart' },
		5: { label: 'Molnigt', summary: 'molnigt' },
		6: { label: 'Mulet', summary: 'mulet' },
		7: { label: 'Dimma', summary: 'dimma' },
		8: { label: 'Lätta regnskurar', summary: 'lätta regnskurar' },
		9: { label: 'Regnskurar', summary: 'regnskurar' },
		10: { label: 'Kraftiga regnskurar', summary: 'kraftiga regnskurar' },
		11: { label: 'Åska', summary: 'åska' },
		12: { label: 'Lätta byar av snöblandat regn', summary: 'lätta byar av snöblandat regn' },
		13: { label: 'Byar av snöblandat regn', summary: 'byar av snöblandat regn' },
		14: { label: 'Kraftiga byar av snöblandat regn', summary: 'kraftiga byar av snöblandat regn' },
		15: { label: 'Lätta snöbyar', summary: 'lätta snöbyar' },
		16: { label: 'Snöbyar', summary: 'snöbyar' },
		17: { label: 'Kraftiga snöbyar', summary: 'kraftiga snöbyar' },
		18: { label: 'Lätt regn', summary: 'lätt regn' },
		19: { label: 'Regn', summary: 'regn' },
		20: { label: 'Kraftigt regn', summary: 'kraftigt regn' },
		21: { label: 'Åska', summary: 'åska' },
		22: { label: 'Lätt snöblandat regn', summary: 'lätt snöblandat regn' },
		23: { label: 'Snöblandat regn', summary: 'snöblandat regn' },
		24: { label: 'Kraftigt snöblandat regn', summary: 'kraftigt snöblandat regn' },
		25: { label: 'Lätt snöfall', summary: 'lätt snöfall' },
		26: { label: 'Snöfall', summary: 'snöfall' },
		27: { label: 'Kraftigt snöfall', summary: 'kraftigt snöfall' }
	};

	const LOCATION_FALLBACK = 'din plats';

	type WeatherMood = {
		icon: string;
		label: string;
		phrases: string[];
	};

	const moodMap = weatherMoods.moods as Record<string, WeatherMood>;

	type SmhiParameter = {
		name: string;
		values: number[];
	};

	type SmhiTimeSeries = {
		validTime: string;
		parameters: SmhiParameter[];
	};

	type WeatherState = {
		temperature: number | null;
		symbolCode: number | null;
		locationName: string;
		timeSeries: SmhiTimeSeries;
		latitude: number;
		longitude: number;
	};

	let now = $state(new Date());
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let weather = $state<WeatherState | null>(null);
	let error = $state('');
	let moodKey = $state<string | null>(null);
	let moodPhrase = $state('');

	const formatDate = (date: Date) =>
		date.toLocaleDateString('sv-SE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});

	const formatTime = (date: Date) =>
		date.toLocaleTimeString('sv-SE', {
			hour: '2-digit',
			minute: '2-digit'
		});

	const getClosestTimeSeries = (timeSeries: SmhiTimeSeries[], targetDate: Date) => {
		if (!timeSeries?.length) return null;
		const target = targetDate.getTime();
		return timeSeries.reduce<{ entry: SmhiTimeSeries; delta: number } | null>(
			(closest, entry) => {
				const delta = Math.abs(new Date(entry.validTime).getTime() - target);
				if (!closest || delta < closest.delta) {
					return { entry, delta };
				}
				return closest;
			},
			null
		)?.entry;
	};

	const getParameterValue = (parameters: SmhiParameter[], name: string) => {
		const parameter = parameters?.find((item) => item.name === name);
		return parameter?.values?.[0] ?? null;
	};

	const fetchSmhiWeather = async (lat: number, lon: number) => {
		const response = await fetch(`${SMHI_ENDPOINT}?lat=${lat}&lon=${lon}`);
		if (!response.ok) {
			const errorPayload = await response.json().catch(() => null);
			const detail =
				errorPayload?.detail || errorPayload?.statusText || errorPayload?.error || null;
			throw new Error(detail ? `SMHI svarade inte som förväntat. ${detail}` : 'SMHI svarade inte som förväntat.');
		}
		const data = await response.json();
		const closest = getClosestTimeSeries(data.timeSeries, new Date());
		if (!closest) {
			throw new Error('Ingen prognos hittades för platsen.');
		}
		return {
			temperature: getParameterValue(closest.parameters, 't'),
			symbolCode: getParameterValue(closest.parameters, 'Wsymb2'),
			timeSeries: closest,
			latitude: lat,
			longitude: lon
		};
	};

	const fetchLocationName = async (lat: number, lon: number) => {
		try {
			const response = await fetch(
				`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=sv`
			);
			if (!response.ok) return null;
			const data = await response.json();
			return data.city || data.locality || data.principalSubdivision || data.countryName || null;
		} catch {
			return null;
		}
	};

	const getPosition = () =>
		new Promise<GeolocationPosition>((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error('Platsdelning stöds inte i den här webbläsaren.'));
				return;
			}
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: false,
				timeout: 10000,
				maximumAge: 10 * 60 * 1000
			});
		});

	let dateLabel = $derived.by(() => {
		const value = formatDate(now);
		return value.charAt(0).toUpperCase() + value.slice(1);
	});

	let timeLabel = $derived.by(() => formatTime(now));

	let symbol = $derived.by(() => (weather?.symbolCode ? WEATHER_SUMMARIES[weather.symbolCode] : null));

	let temperatureLabel = $derived.by(() => {
		if (typeof weather?.temperature === 'number') {
			return `${Math.round(weather.temperature)}°C`;
		}
		return '–°C';
	});

	let summaryLabel = $derived.by(() => symbol?.summary ?? 'oklart väder');
	let locationLabel = $derived.by(() => weather?.locationName ?? LOCATION_FALLBACK);
	let isDay = $derived.by(() => {
		const reference = weather?.timeSeries?.validTime ? new Date(weather.timeSeries.validTime) : now;
		if (!weather) {
			const hour = reference.getHours();
			return hour >= 6 && hour < 20;
		}
		const times = SunCalc.getTimes(reference, weather.latitude, weather.longitude);
		return reference >= times.sunrise && reference < times.sunset;
	});
	let resolved = $derived.by(() =>
		weather?.timeSeries ? resolveFromSmhi(weather.timeSeries, isDay) : null
	);

	$effect(() => {
		if (status !== 'success' || !weather) {
			weatherSnapshot.set({
				summary: null,
				location: null,
				temperature: null,
				resolvedKey: null,
				updatedAt: null
			});
			return;
		}

		weatherSnapshot.set({
			summary: summaryLabel,
			location: weather.locationName ?? LOCATION_FALLBACK,
			temperature: typeof weather.temperature === 'number' ? Math.round(weather.temperature) : null,
			resolvedKey: resolved?.key ?? null,
			updatedAt: new Date().toISOString()
		});
	});

	$effect(() => {
		if (!resolved?.icon) {
			moodKey = null;
			moodPhrase = '';
			return;
		}
		const nextKey = resolveSvgIcon(resolved.icon).replace(/\.svg$/, '');
		if (nextKey === moodKey) return;
		moodKey = nextKey;
		const phrases = moodMap[nextKey]?.phrases ?? [];
		if (!phrases.length) {
			moodPhrase = '';
			return;
		}
		moodPhrase = phrases[Math.floor(Math.random() * phrases.length)];
	});

	onMount(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60 * 1000);
		return () => clearInterval(interval);
	});

	onMount(() => {
		let isMounted = true;

		const loadWeather = async () => {
			status = 'loading';
			error = '';
			try {
				const position = await getPosition();
				const { latitude, longitude } = position.coords;
				const [smhiWeather, locationName] = await Promise.all([
					fetchSmhiWeather(latitude, longitude),
					fetchLocationName(latitude, longitude)
				]);
				if (!isMounted) return;
				weather = {
					...smhiWeather,
					locationName: locationName ?? LOCATION_FALLBACK
				};
				status = 'success';
			} catch (err) {
				if (!isMounted) return;
				status = 'error';
				error = err instanceof Error ? err.message : 'Det gick inte att hämta väderdata.';
			}
		};

		loadWeather();

		return () => {
			isMounted = false;
		};
	});
</script>

<div class="border border-base-200 rounded-lg p-5">
	<div class="flex items-center gap-3 group sidebar-card-heading">
		<div class="icon-box icon-box-md">
			<i class="mi-cloud text-lg icon-muted icon-hover"></i>
		</div>
		<h3 class="font-display text-base" style="font-weight: 600;">Väder & Vind</h3>
	</div>

	<div class="text-center">
		<p class="text-sm text-base-content/60" style="font-weight: 500;">
			{dateLabel}
		</p>
		<p class="text-xs text-base-content/50 mt-1">{timeLabel}</p>

		<div class="mt-4 flex justify-center">
			<div
				class="icon-box weather-icon-box h-20 w-20 flex items-center justify-center text-2xl text-base-content overflow-hidden"
				data-wsymb2={weather?.symbolCode ?? 'unknown'}
				data-weather-key={resolved?.key ?? 'unknown'}
				aria-label={resolved?.key ?? symbol?.label ?? 'Okänt väder'}
			>
				{#if weather?.timeSeries}
					<WeatherIcon timeSeries={weather.timeSeries} {isDay} size={80} />
				{:else}
					—
				{/if}
			</div>
		</div>

		<p class="mt-3 text-sm text-base-content/60">
			{#if status === 'loading'}
				Hämtar väder...
			{:else if status === 'error'}
				{error || 'Det gick inte att hämta väder.'}
			{:else if status === 'success'}
				{temperatureLabel} och {summaryLabel} i {locationLabel}
			{/if}
		</p>

		{#if status === 'success' && moodPhrase}
			<p class="mt-2 text-sm text-base-content/50 italic">“{moodPhrase}”</p>
		{/if}
	</div>
</div>
