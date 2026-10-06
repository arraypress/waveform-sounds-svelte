/**
 * test/types.typecheck.ts
 * -----------------------
 *
 * Type-level assertions, checked by `npm run typecheck` (svelte-check), not
 * vitest. The props derive from the core's `WaveformSoundsOptions`; these
 * pin that they do (so a core option is typed here without an edit), that
 * the camelCase callbacks are replaced by the lowercase props, and that the
 * component exposes the documented API.
 */
import type { ComponentProps } from 'svelte';
import type { WaveformSoundsOptions } from '@arraypress/waveform-sounds';
import type { WaveformSoundsExpose, WaveformSoundsProps } from '../src/lib/types';
import WaveformSounds from '../src/lib/WaveformSounds.svelte';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

assert<Equal<WaveformSoundsProps['player'], WaveformSoundsOptions['player']>>();
assert<Equal<WaveformSoundsProps['sounds'], WaveformSoundsOptions['sounds']>>();
assert<Equal<WaveformSoundsProps['filters'], WaveformSoundsOptions['filters']>>();
assert<Equal<WaveformSoundsProps['strings'], WaveformSoundsOptions['strings']>>();
assert<Equal<Extract<keyof WaveformSoundsProps, `on${string}`>, never>>();

type Props = ComponentProps<typeof WaveformSounds>;
assert<Equal<Props['player'], 'inline' | 'strip' | undefined>>();
// The lowercase callbacks win over the host div's media-event handlers.
assert<Equal<Parameters<NonNullable<Props['onplay']>>[0], import('@arraypress/waveform-sounds').Sound>>();

// The component instance carries every method of the documented API.
type Instance = ReturnType<typeof WaveformSounds>;
assert<Instance extends WaveformSoundsExpose ? true : false>();
