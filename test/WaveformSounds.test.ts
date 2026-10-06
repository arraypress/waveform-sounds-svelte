/**
 * WaveformSounds.test.ts
 * ----------------------
 *
 * The core runtime (`@arraypress/waveform-sounds/no-autoinit`) is mocked at
 * the module boundary. These tests cover the wrapper's own
 * responsibilities: rendering the host + the core's markup, constructing
 * the instance over it with mapped options, omitting unset props, callback
 * forwarding, destroy-on-unmount, rebuilds (and the fresh markup each
 * rebuild gets), host-class ownership, `bind:instance` and the exported
 * imperative API. `integration.test.ts` repeats the important ones against
 * the real runtime.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';

/** Captures every constructed instance so assertions can inspect them. */
const instances: MockSounds[] = [];

/** Construct / destroy events in order, to assert destroy → construct. */
const lifecycle: string[] = [];

/**
 * Stand-in for the core class. Models the runtime's DOM contract: adopt a
 * `[data-ws-list]` already in the host (else render its own markup and
 * remember the original to restore), add its host classes, and mutate the
 * rows it adopted (hide / mark current) the way filtering and playback do.
 */
class MockSounds {
	el: HTMLElement;
	opts: Record<string, unknown>;
	/** The `[data-ws-list]` adopted at construction (null = rendered its own). */
	adopted: Element | null;
	/** `data-url` of each adopted row, and whether any arrived already dirty. */
	rowUrls: string[];
	dirtyOnArrival: boolean;
	play = vi.fn();
	pause = vi.fn();
	toggle = vi.fn();
	next = vi.fn();
	previous = vi.fn();
	setLoop = vi.fn();
	setFilter = vi.fn();
	clearFilters = vi.fn();
	setSort = vi.fn();
	showMore = vi.fn();
	destroy = vi.fn();
	constructor(el: HTMLElement, opts: Record<string, unknown>) {
		this.el = el;
		this.opts = opts;
		const n = instances.length;
		this.adopted = el.querySelector('[data-ws-list]');
		let original: string | null = null;
		if (!this.adopted) {
			original = el.innerHTML;
			el.innerHTML = '<ul data-ws-list><li data-ws-index="0" data-url="/from-manifest.mp3"></li></ul>';
		}
		const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-ws-list] > [data-ws-index]'));
		this.rowUrls = rows.map((r) => r.dataset.url ?? '');
		this.dirtyOnArrival = rows.some((r) => r.classList.contains('is-current'));
		// What filtering / playback leave behind on the rows.
		rows.forEach((r) => r.classList.add('is-current'));
		const player = opts.player === 'strip' ? 'strip' : 'inline';
		el.classList.add('waveform-sounds', `waveform-sounds--${player}`);
		el.dataset.wsInitialized = 'true';
		this.destroy.mockImplementation(() => {
			lifecycle.push(`destroy:${n}`);
			if (original !== null) el.innerHTML = original;
			el.classList.remove('waveform-sounds--inline', 'waveform-sounds--strip');
			delete el.dataset.wsInitialized;
		});
		lifecycle.push(`construct:${n}`);
		instances.push(this);
	}
}

vi.mock('@arraypress/waveform-sounds/no-autoinit', () => ({
	default: MockSounds,
	WaveformSounds: MockSounds,
}));

import WaveformSounds from '../src/lib/WaveformSounds.svelte';
import Harness from './fixtures/Harness.svelte';

type HarnessApi = { set: (k: string, v: unknown) => void; boundInstance: () => unknown };

const soundsA = [
	{ url: '/kick.mp3', title: 'Kick', type: 'One-shots' },
	{ url: '/loop.mp3', title: 'Loop', type: 'Drum loops', bpm: 128, key: 'F minor' },
];

const firstInstance = () => vi.waitFor(() => expect(instances.length).toBeGreaterThan(0));
const host = (container: HTMLElement) => container.querySelector('div.wfs-host') as HTMLDivElement;

beforeEach(() => {
	instances.length = 0;
	lifecycle.length = 0;
});

describe('WaveformSounds (Svelte)', () => {
	it('renders the core markup for `sounds` inside div.wfs-host', () => {
		const { container } = render(WaveformSounds, { props: { sounds: soundsA } });
		const el = host(container);
		expect(el).not.toBeNull();
		const rows = el.querySelectorAll('[data-ws-list] > [data-ws-index]');
		expect(rows).toHaveLength(2);
		expect(rows[1].getAttribute('data-url')).toBe('/loop.mp3');
		expect(el.querySelector('[data-ws-search]')).not.toBeNull();
		expect(el.querySelector('[data-ws-engine]')).not.toBeNull();
	});

	it('carries the runtime classes from the first paint, but never data-waveform-sounds', () => {
		const { container } = render(WaveformSounds, { props: { sounds: soundsA, player: 'strip' } });
		const el = host(container);
		expect(el.classList.contains('waveform-sounds')).toBe(true);
		expect(el.classList.contains('waveform-sounds--strip')).toBe(true);
		// The global auto-init marker would double-mount over this instance.
		expect(el.hasAttribute('data-waveform-sounds')).toBe(false);
	});

	it('renders the toolbar from the markup-shaping props', () => {
		const { container } = render(WaveformSounds, {
			props: { sounds: soundsA, search: false, loopToggle: false, strings: { count: '{count} geluiden' } },
		});
		const el = host(container);
		expect(el.querySelector('[data-ws-search]')).toBeNull();
		expect(el.querySelector('[data-ws-loop]')).toBeNull();
		expect(el.querySelector('[data-ws-count]')!.textContent).toBe('2 geluiden');
	});

	it('renders the sort / key dropdowns from sorts, menuSearch and showCount', () => {
		const { container } = render(WaveformSounds, {
			props: {
				sounds: [...soundsA, { url: '/pad.mp3', title: 'Pad', key: 'C major' }],
				sorts: ['title', 'bpm'],
				showCount: false,
				menuSearch: 0,
			},
		});
		const el = host(container);
		const sort = el.querySelector('[data-ws-menu="sort"]')!;
		// The first usable order is the starting one, shown on the button.
		expect(sort.querySelector('[data-ws-menu-value]')!.textContent).toBe('Name');
		expect(Array.from(sort.querySelectorAll('[role=option]')).map((o) => o.getAttribute('data-value'))).toEqual([
			'title',
			'bpm',
		]);
		// menuSearch 0: the key dropdown gets its search field from the first option.
		expect(el.querySelector('[data-ws-menu="key"] [data-ws-menu-search]')).not.toBeNull();
		expect(el.querySelector('[data-ws-count]')).toBeNull();
	});

	it('sorts=[] renders no sort menu', () => {
		const { container } = render(WaveformSounds, { props: { sounds: soundsA, sorts: [] } });
		expect(host(container).querySelector('[data-ws-menu="sort"]')).toBeNull();
	});

	it('constructs the core over the host, adopting the rendered list', async () => {
		const { container } = render(WaveformSounds, { props: { sounds: soundsA } });
		await firstInstance();
		expect(instances).toHaveLength(1);
		expect(instances[0].el).toBe(host(container));
		expect(instances[0].adopted).toBe(host(container).querySelector('[data-ws-list]'));
		expect(instances[0].rowUrls).toEqual(['/kick.mp3', '/loop.mp3']);
	});

	it('with only a manifest, renders an empty host and forwards the URL', async () => {
		const { container } = render(WaveformSounds, { props: { manifest: '/sounds.json' } });
		expect(host(container).innerHTML).toBe('');
		await firstInstance();
		expect(instances[0].opts.manifest).toBe('/sounds.json');
		expect(instances[0].adopted).toBeNull();
	});

	it('maps props into the constructor options', async () => {
		render(WaveformSounds, {
			props: {
				sounds: soundsA,
				player: 'strip',
				pageSize: 20,
				waveformStyle: 'bars',
				barGap: 0,
				autoAdvance: true,
				playerOptions: { height: 40 },
			},
		});
		await firstInstance();
		expect(instances[0].opts).toMatchObject({
			player: 'strip',
			pageSize: 20,
			waveformStyle: 'bars',
			// 0 is a real value (no gap), not "unset".
			barGap: 0,
			autoAdvance: true,
			playerOptions: { height: 40 },
		});
		expect(instances[0].opts.sounds).toEqual(soundsA);
	});

	it('omits absent props so the core defaults (and data-* on the host) win', async () => {
		render(WaveformSounds, { props: { sounds: soundsA } });
		await firstInstance();
		for (const key of ['player', 'search', 'pageSize', 'loop', 'playerClass', 'manifest']) {
			expect(key in instances[0].opts, key).toBe(false);
		}
	});

	it('forwards explicit boolean props (including false)', async () => {
		render(WaveformSounds, { props: { sounds: soundsA, search: false, arrowAudition: false, loop: true } });
		await firstInstance();
		expect(instances[0].opts.search).toBe(false);
		expect(instances[0].opts.arrowAudition).toBe(false);
		expect(instances[0].opts.loop).toBe(true);
	});

	const CALLBACKS = {
		onready: 'onReady',
		onplay: 'onPlay',
		onpause: 'onPause',
		onend: 'onEnd',
		onfilter: 'onFilter',
		onerror: 'onError',
	} as const;

	it('forwards every callback prop, with the core arguments', async () => {
		const handlers = Object.fromEntries(Object.keys(CALLBACKS).map((prop) => [prop, vi.fn()]));
		const { container } = render(WaveformSounds, { props: { sounds: soundsA, ...handlers } });
		await firstInstance();

		for (const [prop, option] of Object.entries(CALLBACKS)) {
			const fn = instances[0].opts[option];
			expect(typeof fn, option).toBe('function');
			(fn as (...a: unknown[]) => void)('a', 'b');
			expect(handlers[prop], prop).toHaveBeenCalledWith('a', 'b');
		}
		// Destructured, so none of them landed on the host as a DOM handler.
		const el = host(container);
		for (const prop of Object.keys(CALLBACKS)) expect(el.hasAttribute(prop), prop).toBe(false);
	});

	it('reaches the latest handler without rebuilding when a callback changes', async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { component } = render(Harness, { props: { initial: { onplay: first } } });
		await firstInstance();

		(component as unknown as HarnessApi).set('onplay', second);
		flushSync();
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		expect(instances).toHaveLength(1);

		(instances[0].opts.onPlay as (s: unknown) => void)('sound');
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith('sound');
	});

	it('destroys the instance on unmount', async () => {
		const { unmount } = render(WaveformSounds, { props: { sounds: soundsA } });
		await firstInstance();
		const inst = instances[0];
		unmount();
		expect(inst.destroy).toHaveBeenCalledTimes(1);
	});

	it('never constructs if unmounted before the runtime loads', async () => {
		const { unmount } = render(WaveformSounds, { props: { sounds: soundsA } });
		unmount();
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		expect(instances).toHaveLength(0);
	});

	it('rebuilds when the sounds change, adopting the new rows', async () => {
		const { component, container } = render(Harness, { props: { initial: { sounds: soundsA } } });
		await firstInstance();

		(component as unknown as HarnessApi).set('sounds', [...soundsA, { url: '/snare.mp3', title: 'Snare' }]);
		flushSync();
		await vi.waitFor(() => expect(instances.length).toBe(2));

		expect(lifecycle).toEqual(['construct:0', 'destroy:0', 'construct:1']);
		expect(instances[1].rowUrls).toEqual(['/kick.mp3', '/loop.mp3', '/snare.mp3']);
		expect(host(container).querySelectorAll('[data-ws-list] > [data-ws-index]')).toHaveLength(3);
	});

	it('a rebuild for a non-markup option hands the new instance a fresh render', async () => {
		// The markup is unchanged, so Svelte won't rewrite it — but the old
		// instance hid, re-sorted and painted those rows.
		const { component } = render(Harness, { props: { initial: { sounds: soundsA, loop: false } } });
		await firstInstance();
		expect(instances[0].dirtyOnArrival).toBe(false);

		(component as unknown as HarnessApi).set('loop', true);
		flushSync();
		await vi.waitFor(() => expect(instances.length).toBe(2));

		expect(instances[1].opts.loop).toBe(true);
		expect(instances[1].adopted).not.toBeNull();
		expect(instances[1].dirtyOnArrival).toBe(false);
	});

	it('switching from a manifest to sounds renders and adopts the sounds', async () => {
		const { component, container } = render(Harness, {
			props: { initial: { sounds: undefined, manifest: '/sounds.json' } },
		});
		await firstInstance();
		expect(instances[0].adopted).toBeNull();

		(component as unknown as HarnessApi).set('sounds', soundsA);
		flushSync();
		await vi.waitFor(() => expect(instances.length).toBe(2));

		// The manifest instance restored the host on destroy; the rebuild
		// still hands the new one the rendered sounds.
		expect(instances[1].adopted).not.toBeNull();
		expect(instances[1].rowUrls).toEqual(['/kick.mp3', '/loop.mp3']);
		expect(host(container).querySelectorAll('[data-ws-index]')).toHaveLength(2);
	});

	it('exposes the imperative API via the component instance', async () => {
		const result = render(WaveformSounds, { props: { sounds: soundsA } });
		const api = result.component as unknown as Record<string, (...a: unknown[]) => unknown>;
		// Before the runtime mounts: safe no-ops.
		expect(() => api.play(0)).not.toThrow();
		expect(api.getInstance()).toBeNull();

		await firstInstance();
		const inst = instances[0];
		api.play('loop', { at: 0.5 });
		api.pause();
		api.toggle(1);
		api.next();
		api.previous();
		api.setLoop(true);
		api.setFilter({ type: 'Drum loops' });
		api.clearFilters();
		api.setSort('bpm');
		api.showMore();
		expect(inst.play).toHaveBeenCalledWith('loop', { at: 0.5 });
		expect(inst.pause).toHaveBeenCalledTimes(1);
		expect(inst.toggle).toHaveBeenCalledWith(1);
		expect(inst.next).toHaveBeenCalledTimes(1);
		expect(inst.previous).toHaveBeenCalledTimes(1);
		expect(inst.setLoop).toHaveBeenCalledWith(true);
		expect(inst.setFilter).toHaveBeenCalledWith({ type: 'Drum loops' });
		expect(inst.clearFilters).toHaveBeenCalledTimes(1);
		expect(inst.setSort).toHaveBeenCalledWith('bpm');
		expect(inst.showMore).toHaveBeenCalledTimes(1);
		expect(api.getInstance()).toBe(inst);
	});

	it('bind:instance tracks the live core instance across rebuilds', async () => {
		const { component } = render(Harness, { props: { initial: { sounds: soundsA } } });
		const api = component as unknown as HarnessApi;
		expect(api.boundInstance()).toBeNull();
		await firstInstance();
		await vi.waitFor(() => expect(api.boundInstance()).toBe(instances[0]));

		api.set('pageSize', 10);
		flushSync();
		await vi.waitFor(() => expect(instances.length).toBe(2));
		await vi.waitFor(() => expect(api.boundInstance()).toBe(instances[1]));
	});

	it('merges fall-through class + id with the base wfs-host class', () => {
		const { container } = render(WaveformSounds, {
			props: { sounds: soundsA, class: 'custom', id: 'pack-1' },
		});
		const el = host(container);
		expect(el.classList.contains('custom')).toBe(true);
		expect(el.id).toBe('pack-1');
	});

	/* The runtime adds its classes to the host and a class-only change
	 * doesn't rebuild — so if Svelte rewrote the `class` attribute, nothing
	 * would put them back. Through the Harness so only `class` changes. */
	it("keeps the runtime's host classes when only class changes", async () => {
		const { component, container } = render(Harness, { props: { initial: { class: 'first' } } });
		await firstInstance();
		const el = container.querySelector('div') as HTMLDivElement;

		flushSync(() => (component as unknown as HarnessApi).set('class', 'second'));
		await new Promise<void>((resolve) => setTimeout(resolve, 50));

		expect(instances).toHaveLength(1); // no rebuild to paper over it
		expect(el.className.split(' ').sort()).toEqual(
			['second', 'waveform-sounds', 'waveform-sounds--inline', 'wfs-host'].sort()
		);

		flushSync(() => (component as unknown as HarnessApi).set('class', undefined));
		expect(el.className.split(' ').sort()).toEqual(['waveform-sounds', 'waveform-sounds--inline', 'wfs-host'].sort());
	});

	it('a player change swaps the runtime modifier class through the rebuild', async () => {
		const { component, container } = render(Harness, { props: { initial: {} } });
		await firstInstance();
		flushSync(() => (component as unknown as HarnessApi).set('player', 'strip'));
		await vi.waitFor(() => expect(instances.length).toBe(2));
		const el = container.querySelector('div') as HTMLDivElement;
		expect(el.classList.contains('waveform-sounds--strip')).toBe(true);
		expect(el.classList.contains('waveform-sounds--inline')).toBe(false);
		expect(el.querySelector('.ws-list--strip')).not.toBeNull();
	});
});
