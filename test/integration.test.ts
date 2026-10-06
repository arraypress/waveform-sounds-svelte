/**
 * integration.test.ts
 * -------------------
 *
 * The wrapper against the REAL core runtime (`@arraypress/waveform-sounds`,
 * no mock). jsdom is enough for everything but audio: the runtime only
 * constructs its `WaveformPlayer` engine on first play, and this suite
 * hands it a minimal stand-in through `playerClass`.
 *
 * What only the real runtime can prove: that it ADOPTS the markup the
 * wrapper rendered (the very same `<ul>` survives construction — the
 * server-render contract), that its `waveformsounds:*` events bubble out of
 * the host, and that destroy / rebuild leave exactly one live instance.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import Core from '@arraypress/waveform-sounds/no-autoinit';
import WaveformSounds from '../src/lib/WaveformSounds.svelte';
import Harness from './fixtures/Harness.svelte';

/** The smallest engine the runtime drives: loadTrack → onPlay, pause → onPause. */
class StubPlayer {
	static instances: StubPlayer[] = [];
	opts: Record<string, (...a: unknown[]) => void>;
	audio = { src: '', duration: 4, loop: false };
	destroyed = false;
	constructor(_el: HTMLElement, opts: Record<string, (...a: unknown[]) => void>) {
		this.opts = opts;
		StubPlayer.instances.push(this);
	}
	loadTrack(url: string) {
		this.audio.src = url;
		this.opts.onLoad(this);
		this.opts.onPlay(this);
	}
	play() {
		this.opts.onPlay(this);
	}
	pause() {
		this.opts.onPause(this);
	}
	seekTo() {}
	destroy() {
		this.destroyed = true;
	}
}

const sounds = [
	{ url: '/kick.mp3', title: 'Kick', type: 'One-shots', peaks: 'ff80' },
	{ url: '/loop.mp3', title: 'Loop', type: 'Drum loops', bpm: 128 },
	{ url: '/bass.mp3', title: 'Bass', type: 'Bass', key: 'F minor' },
];

const host = (container: HTMLElement) => container.querySelector('div.wfs-host') as HTMLDivElement;
const visibleRows = (el: HTMLElement) =>
	Array.from(el.querySelectorAll<HTMLElement>('[data-ws-list] > [data-ws-index]')).filter((r) => !r.hidden);

afterEach(() => {
	StubPlayer.instances.length = 0;
	vi.unstubAllGlobals();
});

describe('WaveformSounds against the real runtime', () => {
	it('adopts the rendered markup instead of rebuilding it', async () => {
		const onready = vi.fn();
		const { container } = render(WaveformSounds, { props: { sounds, onready } });
		const el = host(container);
		const list = el.querySelector('[data-ws-list]');

		await vi.waitFor(() => expect(onready).toHaveBeenCalledTimes(1));
		const inst = Core.getInstance(el)!;
		expect(onready).toHaveBeenCalledWith(inst);
		expect(el.querySelector('[data-ws-list]')).toBe(list);
		expect(inst.sounds.map((s) => s.url)).toEqual(['/kick.mp3', '/loop.mp3', '/bass.mp3']);
		expect(el.dataset.wsInitialized).toBe('true');
	});

	it('filters through the exported API, reporting through onfilter and a bubbling event', async () => {
		const onfilter = vi.fn();
		const onEvent = vi.fn();
		document.addEventListener('waveformsounds:filter', onEvent);
		const { component, container } = render(WaveformSounds, { props: { sounds, onfilter } });
		const api = component as unknown as { setFilter: (p: object) => void; getInstance: () => unknown };
		await vi.waitFor(() => expect(api.getInstance()).not.toBeNull());
		// The runtime builds on a microtask after construction; wait for it.
		await (api.getInstance() as { ready: Promise<void> }).ready;

		api.setFilter({ type: 'Bass' });
		expect(visibleRows(host(container)).map((r) => r.dataset.url)).toEqual(['/bass.mp3']);
		const [visible] = onfilter.mock.calls.at(-1)!;
		expect((visible as Array<{ url: string }>).map((s) => s.url)).toEqual(['/bass.mp3']);
		expect((onEvent.mock.calls.at(-1)![0] as CustomEvent).detail).toMatchObject({ visible: 1, total: 3 });
		document.removeEventListener('waveformsounds:filter', onEvent);
	});

	it('plays through the engine, firing onplay / onpause with the sound', async () => {
		const onplay = vi.fn();
		const onpause = vi.fn();
		const { component } = render(WaveformSounds, {
			props: { sounds, playerClass: StubPlayer, onplay, onpause },
		});
		const api = component as unknown as { play: (t: unknown) => void; pause: () => void; getInstance: () => unknown };
		await vi.waitFor(() => expect(api.getInstance()).not.toBeNull());
		// The runtime builds on a microtask after construction; wait for it.
		await (api.getInstance() as { ready: Promise<void> }).ready;

		api.play('sound-2'); // ids default to sound-<1-based n>
		expect(StubPlayer.instances).toHaveLength(1);
		expect(onplay.mock.calls[0][0]).toMatchObject({ url: '/loop.mp3', title: 'Loop' });
		api.pause();
		expect(onpause.mock.calls[0][0]).toMatchObject({ url: '/loop.mp3' });
	});

	it('destroys the runtime (and its engine) on unmount', async () => {
		const { component, container, unmount } = render(WaveformSounds, {
			props: { sounds, playerClass: StubPlayer },
		});
		const api = component as unknown as { play: (t: unknown) => void; getInstance: () => unknown };
		await vi.waitFor(() => expect(api.getInstance()).not.toBeNull());
		// The runtime builds on a microtask after construction; wait for it.
		await (api.getInstance() as { ready: Promise<void> }).ready;
		const el = host(container);
		api.play(0);

		unmount();
		expect(Core.getInstance(el)).toBeNull();
		expect(StubPlayer.instances[0].destroyed).toBe(true);
	});

	it('rebuilds on a sounds change, leaving one live instance on the new rows', async () => {
		const { component, container } = render(Harness, { props: { initial: { sounds } } });
		const el = host(container);
		await vi.waitFor(() => expect(Core.getInstance(el)).not.toBeNull());
		const first = Core.getInstance(el)!;
		await first.ready;

		(component as unknown as { set: (k: string, v: unknown) => void }).set('sounds', sounds.slice(0, 1));
		flushSync();
		await vi.waitFor(() => {
			const now = Core.getInstance(el);
			expect(now).not.toBeNull();
			expect(now).not.toBe(first);
		});

		const second = Core.getInstance(el)!;
		await second.ready;
		expect(second.sounds.map((s) => s.url)).toEqual(['/kick.mp3']);
		expect(el.querySelectorAll('[data-ws-index]')).toHaveLength(1);
		expect([...Core.instances.keys()].filter((k) => k === el)).toHaveLength(1);
	});

	it('a manifest is fetched and rendered by the runtime, and restored on unmount', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ version: 1, sounds }) }))
		);
		const onready = vi.fn();
		const { container, unmount } = render(WaveformSounds, { props: { manifest: '/sounds.json', onready } });
		const el = host(container);
		expect(el.innerHTML).toBe('');

		await vi.waitFor(() => expect(onready).toHaveBeenCalledTimes(1));
		expect(fetch).toHaveBeenCalledWith('/sounds.json');
		expect(el.querySelectorAll('[data-ws-index]')).toHaveLength(3);

		const inst = Core.getInstance(el)!;
		unmount();
		expect(inst).not.toBeNull();
		expect(el.innerHTML).toBe('');
	});
});
