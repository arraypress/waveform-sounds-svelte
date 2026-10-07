# Changelog

All notable changes to `@arraypress/waveform-sounds-svelte` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

## [0.2.1] — 2026-10-07

### Changed

- Accepts `@arraypress/waveform-sounds` 0.3.0 (peer `^0.2.0 || ^0.3.0`): the
  BPM range menu, and Loop starting on for a list that marks loops. Nothing
  to change here — `loop` is still forwarded only when you set it, so the
  core's new default (follow the data) applies.

## [0.2.0] — 2026-10-07

### Changed

- **Requires `@arraypress/waveform-sounds` 0.2.0** (peer `^0.2.0`), which adds
  loops and one-shots: `loop: true` on a sound, an All / Loops / One-shots
  filter (`filters` entry `'loop'`), and a Loop toggle that repeats only
  loops. Nothing to change in this component: the sounds and `filters` pass
  through as before.

### Added

- `SoundsLoopFilter` is re-exported with the other types.

## [0.1.0] — 2026-10-06

### Added

- First release: `<WaveformSounds>`, a Svelte 5 (runes) component for
  `@arraypress/waveform-sounds` 0.1.0. Requires Svelte **5.20.0+**
  (peer `^5.20.0`): the first release with `$props.id()` (5.19.10 has none).
- `urlState` (filters + sort kept in the address) is forwarded like every
  other option and rebuilds the list when it changes. Per-sound `download`
  links render in the server markup and are read back by the runtime.
- `idPrefix` for the dropdowns' element ids, defaulting to the host's `id`,
  else `$props.id()` — unique per instance and identical on the server and
  during hydration, so two lists of the same sounds never share ids (the
  core's own fallback is a hash of the sounds).
- Every `WaveformSoundsOptions` key is a typed prop, derived from the
  core's `index.d.ts`, and forwarded through an explicit allowlist —
  including `sorts`, `showCount` and `menuSearch`, which also shape the
  server-rendered markup (the type / key / sort dropdowns and the count). A
  forwarding-drift test fails when the core declares an option the wrapper
  neither forwards nor lists in `NOT_FORWARDED`.
- Server rendering: with `sounds`, the host carries the core's own markup
  (`renderSounds()` from the DOM-free `@arraypress/waveform-sounds/render`),
  which hydration keeps and the runtime adopts instead of rebuilding. With
  `manifest`, the runtime fetches and renders in the browser. The runtime
  itself (`/no-autoinit`) is imported only in the browser.
- Rebuild on any `sounds` or option change; each rebuild hands the new
  instance a fresh render, so it never adopts rows the old one re-sorted,
  hid or painted.
- Lowercase callback props `onready`, `onplay`, `onpause`, `onend`,
  `onfilter`, `onerror` — reached through live closures, so a new handler
  never rebuilds.
- Exported API through `bind:this` — `play`, `pause`, `toggle`, `next`,
  `previous`, `setLoop`, `setFilter`, `clearFilters`, `setSort`,
  `showMore`, `getInstance` — and `bind:instance` for the core instance.
- The runtime's host classes (`waveform-sounds`, `waveform-sounds--inline`
  / `--strip`) survive a `class`-only change, which doesn't rebuild.
