import { defineConfig } from 'vite';
import { resolve } from 'path';
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		preact(),
		tailwindcss(),
	],
	build: {
		outDir: 'build',
	},
	server: {
		port: 3003
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		},
	},
});