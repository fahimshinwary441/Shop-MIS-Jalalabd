import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
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
            entry: 'electron/main.ts',
            vite: {
              build: {
                minify: false,
                outDir: 'dist-electron',
                lib: {
                  entry: 'electron/main.ts',
                  formats: ['cjs'],
                  fileName: () => 'main.cjs',
                },
                rollupOptions: {
                  external: ['electron', 'better-sqlite3'],
                },
              },
            },
          },
          {
            entry: 'electron/preload.ts',
            onclean: (options) => {
              if (process.env.NODE_ENV === 'production') {
                options.clean(options.outDir);
              }
            },
            vite: {
              build: {
                minify: false,
                outDir: 'dist-electron',
                lib: {
                  entry: 'electron/preload.ts',
                  formats: ['cjs'],
                  fileName: () => 'preload.cjs',
                },
                rollupOptions: {
                  external: ['electron'],
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
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
