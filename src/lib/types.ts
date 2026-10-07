/**
 * @module types
 * @description
 * Public TypeScript types for `@arraypress/waveform-sounds-svelte`.
 *
 * The option surface is owned by the core, `@arraypress/waveform-sounds`,
 * whose hand-written `index.d.ts` is re-exported / derived here rather than
 * re-declared — so an option the core adds is typed here without an edit
 * (the runtime forward is NOT automatic; see the component's `$props()`).
 *
 * This module only adds the Svelte-specific surface:
 *
 *   - `WaveformSoundsProps` — the core options accepted as props.
 *   - `WaveformSoundsCallbacks` — lowercase lifecycle callback props
 *     (`onready`, `onplay`, …), the core's `onReady` / `onPlay` / … options.
 *   - `WaveformSoundsExpose` — the imperative API exported by the component
 *     instance, reachable through `bind:this`.
 *
 * @see {@link https://github.com/arraypress/waveform-sounds} — core library
 */
import type {
	Sound,
	SoundsFilter,
	SoundsSort,
	WaveformSounds,
	WaveformSoundsOptions,
} from '@arraypress/waveform-sounds';

/**
 * Core option / data types, re-exported so consumers can import them from
 * this package. Single-source-of-truth definitions shipped by the core.
 */
export type {
	SoundInput,
	Sound,
	SoundsManifest,
	SoundsFilter,
	SoundsSort,
	SoundsLayout,
	SoundsFilterControl,
	SoundsLoopFilter,
	SoundsColumn,
	WaveformSoundsStrings,
	WaveformSoundsOptions,
	WaveformSoundsEventMap,
} from '@arraypress/waveform-sounds';

/** The core's runtime class, as an instance type. */
export type WaveformSoundsInstance = WaveformSounds;

/** The core's callback options, replaced by {@link WaveformSoundsCallbacks}. */
type CoreCallback = 'onReady' | 'onPlay' | 'onPause' | 'onEnd' | 'onFilter' | 'onError';

/**
 * The option surface accepted by `<WaveformSounds>` as props: every
 * `WaveformSoundsOptions` key except the camelCase callbacks (see
 * {@link WaveformSoundsCallbacks} for their lowercase props).
 *
 * Give the list its sounds through `sounds` (rendered on the server and
 * adopted by the runtime) or `manifest` (a JSON URL the runtime fetches in
 * the browser, so nothing is server-rendered).
 *
 * The component also accepts `class`, `id`, `style`, and any other element
 * attribute via `HTMLAttributes<HTMLDivElement>` fall-through — those are
 * declared on the component, not here.
 */
export type WaveformSoundsProps = Omit<WaveformSoundsOptions, CoreCallback>;

/**
 * Lifecycle callback props — the core's `onReady` / `onPlay` / `onPause` /
 * `onEnd` / `onFilter` / `onError` options. Lowercase to match Svelte's
 * native event-attribute convention (`onclick`, `oninput`, …); they replace
 * the same-named media events on the host `<div>`, which never fire there.
 *
 * ```svelte
 * <WaveformSounds {sounds} onplay={(sound) => …} onfilter={(visible) => …} />
 * ```
 *
 * Callback props **don't trigger rebuilds** — they reach the live instance
 * through reactive closures, so changing a handler never tears the list
 * down. The core also dispatches bubbling `waveformsounds:*` DOM events on
 * the host (see `WaveformSoundsEventMap`), for listeners further up the page.
 */
export interface WaveformSoundsCallbacks {
	/** The list is built (after the manifest fetch, if any). */
	onready?: (instance: WaveformSounds) => void;
	/** A sound starts playing. */
	onplay?: (sound: Sound, instance: WaveformSounds) => void;
	/** The playing sound pauses. */
	onpause?: (sound: Sound, instance: WaveformSounds) => void;
	/** A sound plays to its end. */
	onend?: (sound: Sound, instance: WaveformSounds) => void;
	/** After every filter / sort / page change, with the matching sounds. */
	onfilter?: (visible: Sound[], instance: WaveformSounds) => void;
	/** A manifest or audio load failed. */
	onerror?: (error: unknown, instance: WaveformSounds) => void;
}

/**
 * Imperative API exported by the component instance. Reach it with
 * `bind:this`:
 *
 * ```svelte
 * <script lang="ts">
 *   import { WaveformSounds } from '@arraypress/waveform-sounds-svelte';
 *   let list: WaveformSounds;
 * </script>
 *
 * <WaveformSounds bind:this={list} {sounds} />
 * <button onclick={() => list.setFilter({ type: 'Drum loops' })}>Drums</button>
 * ```
 *
 * Each method is a thin pass-through to the core instance; calls before the
 * async instance mounts are safe no-ops. `bind:instance` gives the core
 * instance itself, reactively.
 */
export interface WaveformSoundsExpose {
	/** Play a sound (by index, id or sound), or resume the current one. `at`: start position 0..1. */
	play(target?: number | string | Sound, opts?: { at?: number }): void;
	/** Pause the current sound. */
	pause(): void;
	/** The current sound plays/pauses; another sound starts. */
	toggle(target?: number | string | Sound): void;
	/** Play the next visible sound. */
	next(): void;
	/** Play the previous visible sound. */
	previous(): void;
	/** Loop the current sound. */
	setLoop(on: boolean): void;
	/** Change the filter (merged into the current one). */
	setFilter(patch: Partial<SoundsFilter>): void;
	/** Reset every filter (the sort stays). */
	clearFilters(): void;
	/** Change the sort order. */
	setSort(by: SoundsSort): void;
	/** Reveal the next page of results. */
	showMore(): void;
	/** The core `WaveformSounds` instance, or `null` before it mounts. */
	getInstance(): WaveformSounds | null;
}
