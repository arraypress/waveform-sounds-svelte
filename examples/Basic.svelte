<!--
  examples/Basic.svelte
  ---------------------

  Reference Svelte 5 component demonstrating <WaveformSounds> usage.
  Copy/paste into your own Svelte / SvelteKit app.

  Library setup (do this ONCE in your app entry — e.g. `+layout.svelte`):

    import '@arraypress/waveform-player';                  // registers window.WaveformPlayer
    import '@arraypress/waveform-player/styles.css';
    import '@arraypress/waveform-sounds/styles.css';

  The wrapper does NOT auto-import CSS, and the list plays through
  window.WaveformPlayer (or the class passed as `playerClass`).
-->
<script lang="ts">
	import {
		WaveformSounds,
		type SoundInput,
		type WaveformSoundsInstance,
	} from '@arraypress/waveform-sounds-svelte';

	/* Imperative API via bind:this, the core instance via bind:instance. */
	let list: WaveformSounds;
	let core: WaveformSoundsInstance | null = $state(null);
	let nowPlaying = $state('');
	let shown = $state(0);

	/* Usually `sounds.json` from `waveform-gen --manifest`, imported or loaded
	 * in a SvelteKit `load()` so the list server-renders. */
	const sounds: SoundInput[] = [
		{ url: '/previews/kick-01.mp3', title: 'Kick 01', type: 'One-shots', duration: 0.6 },
		{ url: '/previews/loop-04.mp3', title: 'Drum Loop 04', type: 'Drum loops', bpm: 128, duration: 7.5 },
		{ url: '/previews/bass-02.mp3', title: 'Bass 02', type: 'Bass', bpm: 128, key: 'F minor' },
	];
</script>

<!-- 1 — Minimal: server-rendered, adopted on the client -->
<WaveformSounds {sounds} />

<!-- 2 — Fetched in the browser from a manifest -->
<WaveformSounds manifest="/sounds.json" pageSize={100} />

<!-- 3 — Strip layout, trimmed toolbar, callbacks -->
<WaveformSounds
	{sounds}
	player="strip"
	filters={['type', 'bpm']}
	columns={['bpm', 'key']}
	loop
	autoAdvance
	onplay={(sound) => (nowPlaying = sound.title)}
	onpause={() => (nowPlaying = '')}
/>
<p>{nowPlaying ? `Playing ${nowPlaying}` : 'Nothing playing'}</p>

<!-- 4 — Imperative control -->
<WaveformSounds bind:this={list} bind:instance={core} {sounds} onfilter={(visible) => (shown = visible.length)} />
<div style="display: flex; gap: 0.5rem; margin-top: 1rem">
	<button onclick={() => list.setFilter({ type: 'Drum loops' })}>Drum loops</button>
	<button onclick={() => list.clearFilters()}>All</button>
	<button onclick={() => list.play(0)}>Play first</button>
	<button onclick={() => list.next()}>Next</button>
	<span>{shown} shown</span>
	<button onclick={() => core?.setSort('bpm')}>Sort by BPM</button>
</div>
