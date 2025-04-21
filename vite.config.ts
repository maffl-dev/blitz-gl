import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		outDir: 'build',
	},
	server: {
		port: 3003
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),  // Use 'src' as the base directory for '@' alias
		},
	},
});