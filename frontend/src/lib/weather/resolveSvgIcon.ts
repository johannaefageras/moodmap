const AVAILABLE_SVG_ICONS = new Set<string>([
	'clear-day',
	'clear-night',
	'cloudy',
	'drizzle',
	'dust-day',
	'dust-night',
	'dust',
	'fog-day',
	'fog-night',
	'fog',
	'hail',
	'haze-day',
	'haze-night',
	'haze',
	'hurricane',
	'mist',
	'not-available',
	'overcast-day',
	'overcast-night',
	'overcast',
	'partly-cloudy-day-drizzle',
	'partly-cloudy-day-fog',
	'partly-cloudy-day-hail',
	'partly-cloudy-day-haze',
	'partly-cloudy-day-rain',
	'partly-cloudy-day-sleet',
	'partly-cloudy-day-smoke',
	'partly-cloudy-day-snow',
	'partly-cloudy-day',
	'partly-cloudy-night-drizzle',
	'partly-cloudy-night-fog',
	'partly-cloudy-night-hail',
	'partly-cloudy-night-haze',
	'partly-cloudy-night-rain',
	'partly-cloudy-night-sleet',
	'partly-cloudy-night-smoke',
	'partly-cloudy-night-snow',
	'partly-cloudy-night',
	'rain',
	'sleet',
	'smoke',
	'snow',
	'thunderstorms-day-rain',
	'thunderstorms-day-snow',
	'thunderstorms-day',
	'thunderstorms-night-rain',
	'thunderstorms-night-snow',
	'thunderstorms-night',
	'thunderstorms-rain',
	'thunderstorms-snow',
	'thunderstorms',
	'tornado'
]);

const PRECIP_TOKENS = ['drizzle', 'rain', 'snow', 'sleet', 'hail'];
const VISIBILITY_TOKENS = ['fog', 'haze', 'smoke', 'dust', 'mist'];

function normalizeIconName(icon: string): string {
	return icon.trim().replace(/\.(json|svg)$/i, '');
}

function removeSegment(name: string, segment: string): string {
	return name
		.replace(new RegExp(`(^|-)${segment}(-|$)`, 'g'), '$1')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function addCandidate(
	candidates: string[],
	seen: Set<string>,
	name: string | undefined
): void {
	if (!name) return;
	if (seen.has(name)) return;
	seen.add(name);
	candidates.push(name);
}

export function resolveSvgIcon(icon?: string | null): string {
	if (!icon) return 'not-available.svg';
	const base = normalizeIconName(icon);
	if (!base) return 'not-available.svg';

	const candidates: string[] = [];
	const seen = new Set<string>();
	addCandidate(candidates, seen, base);

	const noExtreme = base.includes('extreme') ? removeSegment(base, 'extreme') : base;
	if (noExtreme !== base) {
		addCandidate(candidates, seen, noExtreme);
	}

	for (const token of PRECIP_TOKENS) {
		if (noExtreme.includes(token)) {
			addCandidate(candidates, seen, removeSegment(noExtreme, token));
		}
	}

	for (const token of VISIBILITY_TOKENS) {
		if (noExtreme.includes(token)) {
			addCandidate(candidates, seen, removeSegment(noExtreme, token));
		}
	}

	if (noExtreme.startsWith('thunderstorms')) {
		const noOvercast = removeSegment(noExtreme, 'overcast');
		addCandidate(candidates, seen, noOvercast);
		const noTime = removeSegment(removeSegment(noOvercast, 'day'), 'night');
		addCandidate(candidates, seen, noTime);
		if (noOvercast.includes('rain')) {
			addCandidate(candidates, seen, removeSegment(noOvercast, 'rain'));
		}
		if (noOvercast.includes('snow')) {
			addCandidate(candidates, seen, removeSegment(noOvercast, 'snow'));
		}
		addCandidate(candidates, seen, 'thunderstorms');
	}

	const noOvercast = removeSegment(noExtreme, 'overcast');
	if (noOvercast !== noExtreme) {
		addCandidate(candidates, seen, noOvercast);
	}

	const noTime = removeSegment(removeSegment(noOvercast, 'day'), 'night');
	if (noTime !== noOvercast) {
		addCandidate(candidates, seen, noTime);
	}

	for (const token of PRECIP_TOKENS) {
		if (base.includes(token)) {
			addCandidate(candidates, seen, token);
		}
	}

	for (const token of VISIBILITY_TOKENS) {
		if (base.includes(token)) {
			addCandidate(candidates, seen, token);
		}
	}

	if (base.includes('wind')) {
		if (base.includes('snow')) {
			addCandidate(candidates, seen, 'snow');
		}
		addCandidate(candidates, seen, 'cloudy');
	}

	for (const name of candidates) {
		if (AVAILABLE_SVG_ICONS.has(name)) {
			return `${name}.svg`;
		}
	}

	return 'not-available.svg';
}
