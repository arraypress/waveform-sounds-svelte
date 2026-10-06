/**
 * vitest.config.ts
 * ----------------
 *
 * Vitest configuration for the Svelte wrapper. The Svelte Vite plugin
 * compiles the `.svelte` component under test; `jsdom` provides the DOM.
 *
 * Most suites mock `@arraypress/waveform-sounds/no-autoinit` at the module
 * boundary, so they verify the wrapper's own responsibilities (forwarding,
 * rebuilds, callbacks, the exported API). `integration.test.ts` runs the
 * REAL core runtime in jsdom — it only needs a `WaveformPlayer` once a
 * sound plays, which that suite stubs through `playerClass`.
 * `ssr.test.ts` server-renders in the node environment.
 */
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'jsdom',
		globals: false,
		setupFiles: ['./test/setup.ts'],
	},
	resolve: {
		conditions: ['browser'],
	},
});
