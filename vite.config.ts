import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	
	// Use environment variable for base path, fallback to dev environment
	const basePath = env.VITE_BASE_PATH || '/zxPlatformQAEnvironment';
	
	// Determine proxy target based on mode
	const proxyTarget = mode === 'qa'
		? 'https://qaapp.zt02.net/zxPlatformQAAPIs'
		: mode === 'dev'
		? 'https://qaapp.zt02.net/zxPlatformDevAPIs'
		: 'https://qaapp.zt02.net/zxPlatformDevAPIs';
	
	return {
		base: basePath,
		server: {
			port: 5173,
			proxy: {
				'/api': {
					target: proxyTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ''),
					configure: (proxy, _options) => {
						proxy.on('error', (err, _req, _res) => {
							console.log('proxy error', err);
						});
						proxy.on('proxyReq', (_proxyReq, req, _res) => {
							console.log('Sending Request to the Target:', req.method, req.url);
						});
						proxy.on('proxyRes', (proxyRes, req, _res) => {
							console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
						});
					},
				}
			}
		},
		plugins: [
			react({
				babel: {
					plugins: ['babel-plugin-macros'],
				},
			}),
		],
		assetsInclude: ['**/*.md'],
		resolve: {
			alias: {
				'@': path.join(__dirname, 'src'),
			},
		},
		build: {
			outDir: 'build',
		},
		define: {
			'process.env.API_URL': JSON.stringify(env.API_URL),
			'process.env.USERNAME': JSON.stringify(env.USERNAME),
			'process.env.PASSWORD': JSON.stringify(env.PASSWORD),
			'process.env.ENV': JSON.stringify(env.ENV),
			'process.env.FALSO_ENABLED': JSON.stringify(env.FALSO_ENABLED),
		},
	};
});
