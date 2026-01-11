import type { ResolvedWeather } from './weather-resolver';
import type { WeatherMapping } from './weather-types';
import { resolveWeatherIcon } from './weather-resolver';
import mapping from './weather-mapping.json';

type SmhiParameter = {
	name: string;
	values: number[];
};

type SmhiTimeSeries = {
	parameters: SmhiParameter[];
};

const defaultMapping = mapping as WeatherMapping;

export function resolveFromSmhi(timeSeries: SmhiTimeSeries, isDay: boolean): ResolvedWeather {
	return resolveWeatherIcon({
		parameters: timeSeries.parameters,
		isDay,
		mapping: defaultMapping
	});
}
