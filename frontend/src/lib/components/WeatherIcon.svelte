<script lang="ts">
	import { resolveFromSmhi } from '$lib/weather/resolveWeather';
	import { resolveSvgIcon } from '$lib/weather/resolveSvgIcon';

	export let timeSeries: {
		parameters: { name: string; values: number[] }[];
	};
	export let isDay = true;
	export let assetsBase = '/weather-icons';
	export let size = 64;
	export let suppressStroke = true;

	$: resolved = timeSeries ? resolveFromSmhi(timeSeries, isDay) : null;
	$: svgIcon = resolveSvgIcon(resolved?.icon);
</script>

<img
	class={`weather-icon ${suppressStroke ? 'no-stroke' : ''}`}
	src={`${assetsBase}/${svgIcon}`}
	alt={resolved?.key ?? 'Okänt väder'}
	style={`width: ${size}px; height: ${size}px;`}
/>
