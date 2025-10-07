import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.tsx',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
        },
    },
    plugins: [
        react(),
        dts()
    ],
});