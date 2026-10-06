<div align="center">

# Waveform Sounds for Svelte

**Svelte 5 component wrapper for `@arraypress/waveform-sounds`.**
A searchable, filterable sound list — typed props for every option, server-rendered markup the runtime adopts, and an exported imperative API.

[![npm version](https://img.shields.io/npm/v/@arraypress/waveform-sounds-svelte?style=flat-square&labelColor=09090b&color=3f3f46)](https://www.npmjs.com/package/@arraypress/waveform-sounds-svelte)
[![license](https://img.shields.io/npm/l/@arraypress/waveform-sounds-svelte?style=flat-square&labelColor=09090b&color=3f3f46)](https://github.com/arraypress)

**[Documentation](https://docs.waveformplayer.com/)** · [npm](https://www.npmjs.com/package/@arraypress/waveform-sounds-svelte)

</div>

---

## Install

```bash
npm install @arraypress/waveform-sounds-svelte @arraypress/waveform-sounds @arraypress/waveform-player svelte
```

Once, in your app entry (e.g. `+layout.svelte`):

```js
import '@arraypress/waveform-player'; // registers window.WaveformPlayer, the audio engine
import '@arraypress/waveform-player/styles.css';
import '@arraypress/waveform-sounds/styles.css';
```

```svelte
<script lang="ts">
  import { WaveformSounds } from '@arraypress/waveform-sounds-svelte';
  import sounds from '$lib/sounds.json'; // npx @arraypress/waveform-gen ./previews/*.mp3 --manifest …
</script>

<WaveformSounds sounds={sounds.sounds} />
<!-- or, fetched in the browser: -->
<WaveformSounds manifest="/sounds.json" />
```

With `sounds`, the list is rendered on the server by the core's own DOM-free
renderer and the runtime adopts that markup on hydration — readable and
crawlable before any script runs. With `manifest`, it is fetched and rendered
in the browser.

## Props

Every `WaveformSoundsOptions` key from the core is a prop (`player`, `search`,
`filters`, `sortable`, `loopToggle`, `pageSize`, `columns`, `strings`,
`waveformStyle`, `loop`, `autoAdvance`, `playerOptions`, `playerClass`, …).
Changing one rebuilds the list. `class`, `id`, `style` and other attributes
land on the host `<div>`.

Callbacks are lowercase props and never rebuild: `onready`, `onplay`,
`onpause`, `onend`, `onfilter`, `onerror`. The core also dispatches bubbling
`waveformsounds:*` DOM events from the host.

## Imperative API

```svelte
<script lang="ts">
  let list: WaveformSounds;
</script>

<WaveformSounds bind:this={list} {sounds} />
<button onclick={() => list.setFilter({ type: 'Drum loops' })}>Drum loops</button>
```

`play(target?, { at? })`, `pause()`, `toggle(target?)`, `next()`,
`previous()`, `setLoop(on)`, `setFilter(patch)`, `clearFilters()`,
`setSort(by)`, `showMore()`, `getInstance()`. Or `bind:instance` for the core
instance itself (`null` until mounted).

## Documentation

### -> [docs.waveformplayer.com](https://docs.waveformplayer.com/)

## License

MIT © [ArrayPress](https://github.com/arraypress)
