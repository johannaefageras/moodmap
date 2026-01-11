import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SMHI_ENDPOINT =
	'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const lat = Number(url.searchParams.get('lat'));
	const lon = Number(url.searchParams.get('lon'));

	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: 'Ogiltiga koordinater.' }, { status: 400 });
	}

	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
		return json({ error: 'Koordinater utanför giltigt spann.' }, { status: 400 });
	}

	const normalizedLat = Number(lat.toFixed(5));
	const normalizedLon = Number(lon.toFixed(5));

	try {
		const response = await fetch(
			`${SMHI_ENDPOINT}/lon/${normalizedLon}/lat/${normalizedLat}/data.json`,
			{
			headers: {
				Accept: 'application/json',
				'User-Agent': 'moodmap-weather-widget'
			}
			}
		);
		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			return json(
				{
					error: 'SMHI svarade inte som förväntat.',
					status: response.status,
					statusText: response.statusText,
					detail: detail.slice(0, 500)
				},
				{ status: response.status }
			);
		}
		const data = await response.json();
		return json(data, {
			headers: {
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (error) {
		return json({ error: 'Kunde inte hämta väderdata.' }, { status: 502 });
	}
};
