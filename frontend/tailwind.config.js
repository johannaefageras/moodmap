import daisyui from 'daisyui';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['TT Norms Pro', 'system-ui', 'sans-serif'],
				display: ['Grenette', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: ['light', 'dark'],
		base: false // We'll define our own base colors
	}
};
