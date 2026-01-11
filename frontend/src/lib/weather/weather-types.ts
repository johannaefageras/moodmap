export type WeatherMapping = {
	thresholds?: {
		tempC?: {
			snowMax?: number;
			sleetMax?: number;
		};
		precipMmPerH?: {
			drizzleMax?: number;
			rainMax?: number;
			extremeMin?: number;
		};
		windMs?: {
			windyMin?: number;
		};
	};
	wsymb2Map?: Record<
		string,
		{
			base?: string;
			precip?: string;
			intensity?: string;
			thunder?: boolean;
		}
	>;
	pcatMap?: Record<string, string>;
	pcatHints?: {
		note?: string;
		fallbackOrder?: string[];
	};
	iconGroups: Record<string, any>;
};
