/// <reference types="node" />
/**
 * hydration.test.ts
 * -----------------
 *
 * The server-render → hydrate → adopt path end to end, against the real
 * runtime: the server's markup is hydrated (not re-created) and the
 * runtime adopts those very nodes rather than rendering its own.
 *
 * Vitest compiles `.svelte` for one target per environment, so the server
 * build of the component is produced here with `svelte/compiler` (Svelte 5
 * strips the `lang="ts"` annotations itself) and written next to the source
 * under `test/` (gitignored), where its package imports resolve the same way.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from 'svelte/compiler';
import { render as renderServer } from 'svelte/server';
import { hydrate, unmount, type Component } from 'svelte';
import Core from '@arraypress/waveform-sounds/no-autoinit';
import WaveformSounds from '../src/lib/WaveformSounds.svelte';

const source = resolve(process.cwd(), 'src/lib/WaveformSounds.svelte');
const serverBuild = resolve(process.cwd(), 'test/.WaveformSounds.server.js');

let ServerComponent: Component<Record<string, unknown>>;

beforeAll(async () => {
	const { js } = compile(readFileSync(source, 'utf8'), { generate: 'server', filename: source });
	writeFileSync(serverBuild, js.code);
	ServerComponent = (await import(/* @vite-ignore */ serverBuild)).default;
});

afterAll(() => rmSync(serverBuild, { force: true }));

const sounds = [
	{ url: '/kick.mp3', title: 'Kick', type: 'One-shots' },
	{ url: '/loop.mp3', title: 'Loop', type: 'Drum loops', bpm: 128 },
];

describe('hydration', () => {
	it('hydrates the server markup and the runtime adopts it', async () => {
		const props = { sounds, player: 'inline' as const, class: 'pack' };
		const { body } = renderServer(ServerComponent, { props });
		const target = document.createElement('main');
		target.innerHTML = body;
		document.body.appendChild(target);
		const serverList = target.querySelector('[data-ws-list]');
		const serverRow = target.querySelector('[data-ws-index="1"]');
		expect(serverList).not.toBeNull();

		const warn = vi.spyOn(console, 'warn');
		const onready = vi.fn();
		const app = hydrate(WaveformSounds, { target, props: { ...props, onready } });
		await vi.waitFor(() => expect(onready).toHaveBeenCalledTimes(1));

		const el = target.querySelector('div.wfs-host') as HTMLDivElement;
		// The very nodes the server sent: neither Svelte nor the runtime re-created them.
		expect(el.querySelector('[data-ws-list]')).toBe(serverList);
		expect(el.querySelector('[data-ws-index="1"]')).toBe(serverRow);
		expect(Core.getInstance(el)!.sounds.map((s) => s.url)).toEqual(['/kick.mp3', '/loop.mp3']);
		expect(el.classList.contains('pack')).toBe(true);
		// The client computed the same markup — incl. the `$props.id()`
		// dropdown ids — or Svelte warns `hydration_html_changed` (dev).
		expect(el.querySelector('[data-ws-menu="sort"] [role=listbox]')!.id).toMatch(/-sort-list$/);
		expect(warn.mock.calls.flat().join(' ')).not.toMatch(/hydration/i);
		warn.mockRestore();

		unmount(app);
		expect(Core.getInstance(el)).toBeNull();
		target.remove();
	});
});
