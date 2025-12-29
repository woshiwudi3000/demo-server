import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isServerBuild = mode === 'server' || process.env.BUILD_TARGET === 'server';
  
  if (isServerBuild) {
    // Server build configuration
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false, // Don't empty on server build to preserve frontend build
        rollupOptions: {
          input: resolve(__dirname, 'server/index.ts'),
          output: {
            format: 'es',
            entryFileNames: 'server/[name].js',
            chunkFileNames: 'server/chunks/[name]-[hash].js',
            assetFileNames: 'server/assets/[name]-[hash][extname]',
            preserveModules: true,
            preserveModulesRoot: 'server',
          },
        },
        target: 'node18',
        minify: false, // Node.js projects typically don't need minification
        sourcemap: true,
        ssr: true, // SSR mode for Node.js
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, './server'),
        },
      },
      ssr: {
        // Externalize all dependencies (node_modules)
        noExternal: [],
      },
    };
  }
  
  // Frontend build configuration
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
