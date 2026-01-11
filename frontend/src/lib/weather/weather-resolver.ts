import type { WeatherMapping } from './weather-types';
import mapping from './weather-mapping.json';

type SmhiParameter = {
	name: string;
	values: number[] | number;
};

type ResolveInput = {
	parameters: SmhiParameter[];
	isDay: boolean;
	mapping?: WeatherMapping;
	overrides?: {
		pcatMap?: Record<string, string>;
		thunderProbabilityMin?: number;
		visibilityFogMaxKm?: number;
		visibilityMistMaxKm?: number;
		visibilityHazeMaxKm?: number;
	};
};

export type ResolvedWeather = {
	icon: string;
	key: string;
	detail: {
		base: string;
		precip: string;
		intensity: string;
		thunder: boolean;
		visibility: string | null;
		wind: boolean;
		isDay: boolean;
	};
};

const defaultMapping = mapping as WeatherMapping;

const DEFAULT_THRESHOLDS = {
	tempC: {
		snowMax: 0.5,
		sleetMax: 1.5
	},
	precipMmPerH: {
		drizzleMax: 0.2,
		rainMax: 2.0,
		extremeMin: 10.0
	},
	windMs: {
		windyMin: 10.0
	}
};

export function resolveWeatherIcon(input: ResolveInput): ResolvedWeather {
	const mapping = input.mapping ?? defaultMapping;
	const thresholds = {
		...DEFAULT_THRESHOLDS,
		...mapping.thresholds,
		tempC: { ...DEFAULT_THRESHOLDS.tempC, ...mapping.thresholds?.tempC },
		precipMmPerH: {
			...DEFAULT_THRESHOLDS.precipMmPerH,
			...mapping.thresholds?.precipMmPerH
		},
		windMs: { ...DEFAULT_THRESHOLDS.windMs, ...mapping.thresholds?.windMs }
	};

	const paramMap = toParamMap(input.parameters);
	const wsymb2 = getNumber(paramMap, 'Wsymb2');
	const t = getNumber(paramMap, 't');
	const pcat = getNumber(paramMap, 'pcat');
	const pmean = getNumber(paramMap, 'pmean');
	const pmin = getNumber(paramMap, 'pmin');
	const pmax = getNumber(paramMap, 'pmax');
	const tstm = getNumber(paramMap, 'tstm');
	const tccMean = getNumber(paramMap, 'tcc_mean');
	const ws = getNumber(paramMap, 'ws');
	const gust = getNumber(paramMap, 'gust');
	const vis = getNumber(paramMap, 'vis');

	const wsymbEntry = wsymb2 != null ? mapping.wsymb2Map?.[String(wsymb2)] : undefined;

	let base = wsymbEntry?.base ?? deriveBaseFromCloudiness(tccMean);
	let precip = wsymbEntry?.precip ?? 'none';
	let intensity = wsymbEntry?.intensity ?? 'normal';
	let thunder = wsymbEntry?.thunder ?? false;
	let visibility: string | null = null;

	if (tstm != null) {
		const thunderMin = input.overrides?.thunderProbabilityMin ?? 1;
		thunder = thunder || tstm >= thunderMin;
	}

	if (pcat != null) {
		const pcatMap = input.overrides?.pcatMap;
		if (pcatMap && pcatMap[String(pcat)]) {
			precip = pcatMap[String(pcat)];
		}
	}

	const precipAmount = firstNumber(pmean, pmax, pmin);
	if (precipAmount != null && precipAmount > 0) {
		if (t != null) {
			if (t <= thresholds.tempC.snowMax) {
				precip = 'snow';
			} else if (t <= thresholds.tempC.sleetMax) {
				precip = 'sleet';
			} else {
				precip = 'rain';
			}
		}
		if (precip === 'rain' && precipAmount <= thresholds.precipMmPerH.drizzleMax) {
			precip = 'drizzle';
		}
		if (precipAmount >= thresholds.precipMmPerH.extremeMin) {
			intensity = 'extreme';
		}
	} else if (precip === 'rain' && precipAmount === 0) {
		precip = 'none';
	}

	if (base === 'fog') {
		visibility = 'fog';
	} else if (vis != null) {
		const fogMax = input.overrides?.visibilityFogMaxKm ?? 1;
		const mistMax = input.overrides?.visibilityMistMaxKm ?? 5;
		const hazeMax = input.overrides?.visibilityHazeMaxKm ?? 8;
		if (vis <= fogMax) {
			visibility = 'fog';
		} else if (vis <= mistMax) {
			visibility = 'mist';
		} else if (vis <= hazeMax) {
			visibility = 'haze';
		}
	}

	const windSpeed = Math.max(ws ?? 0, gust ?? 0);
	const wind = windSpeed >= thresholds.windMs.windyMin;

	const icon = resolveIconFromGroups(mapping.iconGroups, {
		base,
		precip,
		intensity,
		thunder,
		visibility,
		wind,
		isDay: input.isDay
	});

	const key = buildKey({ thunder, precip, base, intensity, visibility, wind, isDay: input.isDay });

	return {
		icon,
		key,
		detail: { base, precip, intensity, thunder, visibility, wind, isDay: input.isDay }
	};
}

function toParamMap(parameters: SmhiParameter[]): Record<string, number> {
	const map: Record<string, number> = {};
	for (const param of parameters) {
		const value = Array.isArray(param.values) ? param.values[0] : param.values;
		if (typeof value === 'number') {
			map[param.name] = value;
		}
	}
	return map;
}

function getNumber(map: Record<string, number>, name: string): number | undefined {
	const value = map[name];
	return typeof value === 'number' ? value : undefined;
}

function firstNumber(...values: Array<number | undefined>): number | undefined {
	for (const value of values) {
		if (typeof value === 'number') {
			return value;
		}
	}
	return undefined;
}

function deriveBaseFromCloudiness(tccMean?: number): string {
	if (tccMean == null) {
		return 'clear';
	}
	if (tccMean <= 2) {
		return 'clear';
	}
	if (tccMean <= 5) {
		return 'partly-cloudy';
	}
	if (tccMean <= 7) {
		return 'cloudy';
	}
	return 'overcast';
}

function resolveIconFromGroups(
	iconGroups: Record<string, any>,
	detail: {
		base: string;
		precip: string;
		intensity: string;
		thunder: boolean;
		visibility: string | null;
		wind: boolean;
		isDay: boolean;
	}
): string {
	if (detail.wind) {
		const windGroup = iconGroups.wind;
		if (detail.precip === 'snow' && windGroup?.snow) {
			return windGroup.snow;
		}
		if (windGroup?.default) {
			return windGroup.default;
		}
	}

	if (detail.visibility) {
		const visibilityGroup = iconGroups.visibility?.[detail.visibility];
		const visibilityIcon = pickByBaseAndTime(visibilityGroup, detail.base, detail.isDay);
		if (visibilityIcon) {
			return visibilityIcon;
		}
	}

	if (detail.thunder) {
		const thunderGroup = iconGroups.thunder;
		if (detail.precip !== 'none') {
			const precipGroup = thunderGroup?.[detail.precip];
			const precipIcon = pickByBaseAndTime(
				precipGroup,
				detail.base,
				detail.isDay,
				detail.intensity
			);
			if (precipIcon) {
				return precipIcon;
			}
		}
		const thunderIcon = pickByBaseAndTime(
			thunderGroup,
			detail.base,
			detail.isDay,
			detail.intensity
		);
		if (thunderIcon) {
			return thunderIcon;
		}
	}

	if (detail.intensity === 'extreme') {
		const extremeGroup = iconGroups.extreme;
		if (detail.precip !== 'none' && extremeGroup?.[detail.precip]) {
			const extremePrecip = pickDayNight(extremeGroup[detail.precip], detail.isDay);
			if (extremePrecip) {
				return extremePrecip;
			}
		}
		if (detail.visibility && extremeGroup?.[detail.visibility]) {
			const extremeVisibility = pickDayNight(extremeGroup[detail.visibility], detail.isDay);
			if (extremeVisibility) {
				return extremeVisibility;
			}
		}
		const extremeBase = pickDayNight(extremeGroup, detail.isDay);
		if (extremeBase) {
			return extremeBase;
		}
	}

	if (detail.precip !== 'none') {
		const precipGroup = iconGroups.precip?.[detail.precip];
		const precipIcon = pickByBaseAndTime(precipGroup, detail.base, detail.isDay);
		if (precipIcon) {
			return precipIcon;
		}
	}

	const baseGroup = iconGroups[detail.base];
	const baseIcon = pickDayNight(baseGroup, detail.isDay);
	if (baseIcon) {
		return baseIcon;
	}

	return iconGroups.extras?.['not-available'] ?? 'not-available.json';
}

function pickByBaseAndTime(group: any, base: string, isDay: boolean, intensity?: string): string | undefined {
	if (!group) return undefined;
	const intensityGroup = intensity === 'extreme' ? group.extreme : undefined;
	if (intensityGroup) {
		const intensityIcon = pickByBaseAndTime(intensityGroup, base, isDay);
		if (intensityIcon) return intensityIcon;
	}
	if (base === 'overcast' && group.overcast) {
		return pickDayNight(group.overcast, isDay);
	}
	if (base === 'partly-cloudy' && group['partly-cloudy']) {
		return pickDayNight(group['partly-cloudy'], isDay);
	}
	return pickDayNight(group, isDay);
}

function pickDayNight(group: any, isDay: boolean): string | undefined {
	if (!group) return undefined;
	if (isDay && group.day) return group.day;
	if (!isDay && group.night) return group.night;
	if (group.default) return group.default;
	return undefined;
}

function buildKey(detail: {
	thunder: boolean;
	precip: string;
	base: string;
	intensity: string;
	visibility: string | null;
	wind: boolean;
	isDay: boolean;
}): string {
	const parts: string[] = [];
	if (detail.wind) parts.push('wind');
	if (detail.thunder) parts.push('thunder');
	if (detail.visibility) parts.push(detail.visibility);
	if (detail.precip !== 'none') parts.push(detail.precip);
	if (detail.intensity === 'extreme') parts.push('extreme');
	parts.push(detail.base);
	parts.push(detail.isDay ? 'day' : 'night');
	return parts.join('+');
}
