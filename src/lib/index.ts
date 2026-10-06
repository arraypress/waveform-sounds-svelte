/**
 * @module @arraypress/waveform-sounds-svelte
 * @description
 * Public entry point for the Svelte 5 wrapper around
 * `@arraypress/waveform-sounds`.
 *
 * ```svelte
 * <script lang="ts">
 *   import { WaveformSounds } from '@arraypress/waveform-sounds-svelte';
 * </script>
 *
 * <WaveformSounds
 *   sounds={[
 *     { url: '/previews/kick.mp3', title: 'Kick 01', type: 'One-shots' },
 *     { url: '/previews/loop.mp3', title: 'Loop 04', type: 'Drum loops', bpm: 128 },
 *   ]}
 * />
 * ```
 *
 * ## Types
 *
 * ```ts
 * import type {
 *   WaveformSoundsProps,
 *   WaveformSoundsCallbacks,
 *   WaveformSoundsExpose,
 *   WaveformSoundsInstance,
 *   WaveformSoundsOptions,
 *   SoundInput,
 *   Sound,
 * } from '@arraypress/waveform-sounds-svelte';
 * ```
 */
export { default as WaveformSounds } from './WaveformSounds.svelte';

export type {
	WaveformSoundsProps,
	WaveformSoundsCallbacks,
	WaveformSoundsExpose,
	WaveformSoundsInstance,
	WaveformSoundsOptions,
	WaveformSoundsStrings,
	WaveformSoundsEventMap,
	SoundInput,
	Sound,
	SoundsManifest,
	SoundsFilter,
	SoundsSort,
	SoundsLayout,
	SoundsFilterControl,
	SoundsColumn,
} from './types.js';
