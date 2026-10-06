<!--
  Test harness: renders <WaveformSounds> the way a real parent does, with
  each option in its own reactive slot, so changing one prop invalidates
  only that prop. `@testing-library/svelte`'s own `rerender()` replaces a
  single `$state.raw` props object, which invalidates EVERY prop at once
  and would make any change look like a rebuild input.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { WaveformSounds as Core } from '@arraypress/waveform-sounds';
	import WaveformSounds from '../../src/lib/WaveformSounds.svelte';

	let { initial = {} }: { initial?: Record<string, unknown> } = $props();

	const opts: Record<string, unknown> = $state(untrack(() => ({ ...initial })));

	/** The bound core instance (`bind:instance`). */
	let bound: Core | null = $state(null);

	/** Change one prop on the rendered list. */
	export function set(key: string, value: unknown): void {
		opts[key] = value;
	}

	/** What `bind:instance` currently holds. */
	export function boundInstance(): unknown {
		return bound;
	}
</script>

<WaveformSounds sounds={[{ url: '/a.mp3', title: 'A' }]} {...opts} bind:instance={bound} />
