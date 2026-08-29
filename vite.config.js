import { defineConfig } from 'vite';

export default defineConfig({
  // Göreli yollar: Capacitor/PWA paketlemesi mutlak kök varsaymasın diye
  base: './',
  // Asset paketi (CC0 NinjaAdventure) publicDir olarak servis edilir: 'pack/...' URL'leri
  publicDir: 'assets',
  server: { host: true },
});
