import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.mgsusa.llc',
  // Concept previews only. The production site is still the hand-written HTML
  // at the repo root; nothing here is deployed until a direction is chosen.
  build: { format: 'directory' }
});
