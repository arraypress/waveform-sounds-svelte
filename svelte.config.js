/**
 * svelte.config.js
 * ----------------
 *
 * Used by `svelte-package` (to preprocess `<script lang="ts">` in the
 * `.svelte` source before copying it to `dist/`) and by `svelte-check`.
 * No SvelteKit adapter — this is a plain component library.
 */
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
};
