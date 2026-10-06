// @vitest-environment node
/**
 * ssr.test.ts
 * -----------
 *
 * Server rendering, in the node environment (no `window`, no `document`).
 * The component must render without touching the browser runtime — only
 * the DOM-free `@arraypress/waveform-sounds/render` runs on the server —
 * and must emit the core's own markup, which the runtime adopts on the
 * client.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { renderSounds } from '@arraypress/waveform-sounds/render';
import WaveformSounds from '../src/lib/WaveformSounds.svelte';

const sounds = [
	{ url: '/kick.mp3', title: 'Kick', type: 'One-shots' },
	{ url: '/loop.mp3', title: 'Loop <04>', type: 'Drum loops', bpm: 128 },
];

describe('server rendering', () => {
	it('runs with no DOM globals', () => {
		expect(typeof window).toBe('undefined');
		expect(typeof document).toBe('undefined');
	});

	it("emits the host with the core's markup inside", () => {
		const { body } = render(WaveformSounds, {
			props: { sounds, player: 'strip', pageSize: 1, class: 'pack', id: 'p1' },
		});
		expect(body).toMatch(/<div[^>]*class="waveform-sounds waveform-sounds--strip wfs-host pack"/);
		expect(body).toContain('id="p1"');
		expect(body).not.toContain('data-waveform-sounds');
		expect(body).toContain(renderSounds(sounds, { player: 'strip', pageSize: 1 }));
		// Escaped by the core renderer, not double-escaped by Svelte.
		expect(body).toContain('Loop &lt;04&gt;');
	});

	it('renders an empty host for a manifest (fetched in the browser)', () => {
		const { body } = render(WaveformSounds, { props: { manifest: '/sounds.json' } });
		expect(body).toMatch(/<div[^>]*class="waveform-sounds waveform-sounds--inline wfs-host"[^>]*>(<!--[^>]*-->)*<\/div>/);
		expect(body).not.toContain('data-ws-list');
	});

	it('never emits callback props or `instance` as attributes', () => {
		const { body } = render(WaveformSounds, {
			props: { sounds, onplay: () => {}, onfilter: () => {}, instance: null },
		});
		expect(body).not.toMatch(/\son(play|filter)=/);
		expect(body).not.toContain('instance=');
	});
});
