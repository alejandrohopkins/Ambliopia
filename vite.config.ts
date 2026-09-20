import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: el mismo build sirve en la raíz de un dominio y en un
  // subdirectorio de GitHub Pages sin tocar nada.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg', 'iconos/icono-ios-180.png', 'fuentes/*.woff2'],
      manifest: {
        name: 'Misión Pixel',
        short_name: 'Misión Pixel',
        description:
          'Juego complemento del tratamiento de ambliopía. Los datos se guardan solo en el dispositivo.',
        lang: 'es',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#1B1446',
        theme_color: '#1B1446',
        categories: ['games', 'education', 'health'],
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'iconos/icono-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Todo el juego se precarga: funciona sin conexión desde la segunda visita.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // Sin backend ni peticiones externas: no hay nada más que cachear.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
