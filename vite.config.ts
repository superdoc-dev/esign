import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.js'),
        },
        rollupOptions: {
            external: ['superdoc'],
        },
    },
    plugins: [dts()],
});
