import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [
		react({
			include: '**/*.{jsx,js}'
		})
	],
	optimizeDeps: {
		esbuildOptions: {
			loader: {
				'.js': 'jsx'
			}
		}
	},
	build: {
		// Optimize build performance
		minify: 'esbuild',
		target: 'es2015',
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					'react-vendor': ['react', 'react-dom', 'react-router-dom'],
					'leaflet-vendor': ['leaflet', 'react-leaflet']
				}
			}
		}
	},
	server: {
		port: 5173
	}
});
