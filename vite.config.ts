import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isCloudRun = !!(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);

  return {
    plugins: [
      react(), 
      tailwindcss(),
      ...(!isCloudRun ? [
        electron([
          {
            // Main-Process entry point of the Electron App.
            entry: path.join(__dirname, 'electron/main.ts'),
            vite: {
              build: {
                minify: false,
                lib: {
                  entry: path.join(__dirname, 'electron/main.ts'),
                  formats: ['cjs'],
                  fileName: () => 'main.cjs',
                },
                rollupOptions: {
                  external: ['electron', 'better-sqlite3'],
                  output: {
                    exports: 'none',
                  },
                },
              },
            },
          },
          {
            entry: path.join(__dirname, 'electron/preload.ts'),
            vite: {
              build: {
                minify: false,
                lib: {
                  entry: path.join(__dirname, 'electron/preload.ts'),
                  formats: ['cjs'],
                  fileName: () => 'preload.cjs',
                },
                rollupOptions: {
                  external: ['electron'],
                  output: {
                    exports: 'none',
                  },
                },
              },
            },
          },
        ]),
        renderer(),
      ] : []),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
