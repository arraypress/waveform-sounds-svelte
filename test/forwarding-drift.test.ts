/**
 * test/forwarding-drift.test.ts
 * -----------------------------
 *
 * Forwarding-drift guard. The props type inherits every option from the
 * core, but a prop only reaches the runtime if it is destructured from
 * `$props()` AND set in the options builder — otherwise it falls into
 * `...rest`, lands on the host `<div>` and is silently dropped. That is how
 * `crossOrigin` went missing from all four playlist wrappers for two weeks.
 *
 * Every key of `WaveformSoundsOptions` (read from the installed core's
 * `index.d.ts`, see `option-surface.ts`) must either be forwarded — and
 * rebuild the list when it changes — or be listed in `NOT_FORWARDED` with
 * the reason. Callback options map to the lowercase Svelte prop
 * (`onFilter` → `onfilter`). Adding an option to the core without deciding
 * which fails this file.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { ALL_OPTIONS, isCallback } from './option-surface';

/**
 * Options deliberately NOT forwarded to the constructor. Empty today: the
 * wrapper forwards the whole surface (`sounds` is ALSO rendered into the
 * host as markup). Keep each entry commented with its reason.
 */
const NOT_FORWARDED: Record<string, string> = {};

/**
 * Values for the options whose sentinel string would not survive the
 * server renderer (it maps over these). Everything else gets
 * `__<key>__`. Each has a distinct second value for the rebuild check.
 */
const SAMPLES: Record<string, [unknown, unknown]> = {
	sounds: [[{ url: '/a.mp3', title: 'A' }], [{ url: '/b.mp3', title: 'B' }]],
	filters: [['type'], ['key']],
	sorts: [['title', 'default'], ['default']],
	columns: [['bpm'], ['key']],
	strings: [{ all: 'Alle' }, { all: 'Tout' }],
	playerOptions: [{ height: 40 }, { height: 50 }],
};

const FORWARDED = ALL_OPTIONS.filter((key) => !(key in NOT_FORWARDED));
const VALUES = FORWARDED.filter((key) => !isCallback(key));
const CALLBACKS = FORWARDED.filter(isCallback);

const first = (key: string): unknown => (key in SAMPLES ? SAMPLES[key][0] : `__${key}__`);
const second = (key: string): unknown => (key in SAMPLES ? SAMPLES[key][1] : `__${key}__changed`);

const instances: Array<Record<string, unknown>> = [];

vi.mock('@arraypress/waveform-sounds/no-autoinit', () => {
	class Mock {
		destroy = () => {};
		constructor(_el: HTMLElement, opts: Record<string, unknown>) {
			instances.push(opts);
		}
	}
	return { default: Mock, WaveformSounds: Mock };
});

import Harness from './fixtures/Harness.svelte';

type HarnessApi = { set: (key: string, value: unknown) => void };

beforeEach(() => {
	instances.length = 0;
});

describe('forwarding drift', () => {
	it('reads a plausible option surface from the core', () => {
		expect(ALL_OPTIONS.length).toBeGreaterThan(20);
		expect(ALL_OPTIONS).toContain('sounds');
		expect(ALL_OPTIONS).toContain('playerClass');
		expect(ALL_OPTIONS).toContain('onFilter');
	});

	it('NOT_FORWARDED lists only real options (no stale entries)', () => {
		expect(Object.keys(NOT_FORWARDED).filter((key) => !ALL_OPTIONS.includes(key))).toEqual([]);
	});

	it('SAMPLES lists only real options (no stale entries)', () => {
		expect(Object.keys(SAMPLES).filter((key) => !ALL_OPTIONS.includes(key))).toEqual([]);
	});

	it('forwards every other option into the constructor options', async () => {
		const initial = Object.fromEntries(VALUES.map((key) => [key, first(key)]));
		render(Harness, { props: { initial } });
		await vi.waitFor(() => expect(instances).toHaveLength(1));

		const dropped = VALUES.filter((key) => {
			try {
				expect(instances[0][key]).toEqual(first(key));
				return false;
			} catch {
				return true;
			}
		});
		expect(dropped, 'options neither forwarded nor in NOT_FORWARDED').toEqual([]);
	});

	it('rebuilds when any forwarded option changes', { timeout: 30_000 }, async () => {
		const initial = Object.fromEntries(VALUES.map((key) => [key, first(key)]));
		const { component } = render(Harness, { props: { initial } });
		await vi.waitFor(() => expect(instances).toHaveLength(1));

		const stale: string[] = [];
		for (const key of VALUES) {
			const before = instances.length;
			(component as unknown as HarnessApi).set(key, second(key));
			flushSync();
			try {
				await vi.waitFor(() => expect(instances.length).toBeGreaterThan(before), { timeout: 250 });
			} catch {
				stale.push(key);
			}
		}
		expect(stale, 'forwarded options that do not rebuild the list').toEqual([]);
	});

	it('forwards every callback option, reaching the lowercase prop handler', async () => {
		const handlers = Object.fromEntries(CALLBACKS.map((key) => [key.toLowerCase(), vi.fn()]));
		render(Harness, { props: { initial: handlers } });
		await vi.waitFor(() => expect(instances).toHaveLength(1));

		const dropped = CALLBACKS.filter((key) => {
			const fn = instances[0][key];
			if (typeof fn !== 'function') return true;
			fn('x');
			return !handlers[key.toLowerCase()].mock.calls.length;
		});
		expect(dropped, 'callbacks neither forwarded nor in NOT_FORWARDED').toEqual([]);
	});
});
