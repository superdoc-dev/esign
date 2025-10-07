import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: '/',
    resolve: {
        alias: {
            'superdoc/dist/style.css': path.resolve(__dirname, '../node_modules/superdoc/dist/style.css')
        }
    }
});