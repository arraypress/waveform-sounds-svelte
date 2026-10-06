/**
 * test/peer-ranges.test.ts
 * ------------------------
 *
 * The peer floors are load-bearing, not cosmetic.
 * `@arraypress/waveform-sounds@0.1.0` is the first release (and the first
 * with the `/render` + `/no-autoinit` subpaths this wrapper imports);
 * it in turn needs `@arraypress/waveform-player@1.24.5` as its engine.
 * Also guards the local-dev devDependency: `file:../waveform-sounds` is
 * fine in the repo but must never reach `peerDependencies`.
 */
import { describe, it, expect } from 'vitest';
import pkg from '../package.json';

/** The lowest version a `^x.y.z` range admits, as comparable numbers. */
const floor = (range: string): number[] => {
	const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
	if (!m) throw new Error(`expected a ^x.y.z range, got ${range}`);
	return m.slice(1).map(Number);
};
const atLeast = (range: string, min: string): boolean => {
	const [a, b] = [floor(range), floor(`^${min}`)];
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
	return true;
};

describe('peer dependency floors', () => {
	it('requires waveform-sounds >= 0.1.0 (the /render and /no-autoinit subpaths)', () => {
		expect(atLeast(pkg.peerDependencies['@arraypress/waveform-sounds'], '0.1.0')).toBe(true);
	});

	it("requires waveform-player >= 1.24.5 (the sounds core's own floor)", () => {
		expect(atLeast(pkg.peerDependencies['@arraypress/waveform-player'], '1.24.5')).toBe(true);
	});

	it('requires Svelte >= 5.20.0 ($props.id(), the SSR-stable id prefix)', () => {
		// Verified against the published tarballs: 5.19.10 (the last 5.19)
		// has no `$props.id`; 5.20.0 introduces it.
		expect(atLeast(pkg.peerDependencies.svelte, '5.20.0')).toBe(true);
	});
});
