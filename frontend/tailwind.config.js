/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	// Updated content array to include jsx, ts, and tsx extensions ensures all React components are scanned
	content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
	theme: {
		extend: {
			screens: {
				'2xl': '2000px',
				1800: '1800px',
				xxl: '1200px',
				med: '900px',
				h700: { raw: '(max-height: 700px)' }, // Add a custom media query for height
			},
			colors: {
				primary: '#3B82F6',
				secondary: '#FFFFFF',
				tertiary: '#6B7280',
				blueLight: '#60A5FA',
				blueMid: '#2563EB',
				blueDark: '#1E40AF',
				blueExtraDark: '#1E3A8A',
				grayLight: '#D1D5DB',
				grayMid: '#4B5563',
				grayDark: '#1F2937',
				grayExtraDark: '#111827',
			},
			backgroundImage: {
				'gradient-primaryToRight': 'linear-gradient(to right, #60A5FA, #1E40AF)',
				'gradient-primaryToLeft': 'linear-gradient(to left, #60A5FA, #1E40AF)',
				'gradient-grayToRight': 'linear-gradient(to right, #D1D5DB, #1F2937)',
				'gradient-grayToLeft': 'linear-gradient(to left, #D1D5DB, #1F2937)',
				'gradient-grayMidToRight': 'linear-gradient(to right, #4B5563, #111827)',
				'gradient-grayMidToLeft': 'linear-gradient(to left, #4B5563, #1F2937)',
			},
			fontFamily: {
				sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
				serif: ['Merriweather', 'Georgia', 'serif'],
				mono: ['Fira Code', 'Courier New', 'monospace'],
				custom: ['Poppins', 'Roboto', 'sans-serif'],
				bebas: ['Bebas Neue', 'sans-serif'],
				anton: ['Anton', 'sans-serif'],
				littleone: ['Little One', 'cursive'],
				archivo: ['Archivo Black', 'sans-serif'],
				abril: ['Abril Fatface', 'serif'],
				rowdies: ['Rowdies', 'cursive'],
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('tailwind-scrollbar'),
		require('tailwindcss-rtl'),
	],
};
