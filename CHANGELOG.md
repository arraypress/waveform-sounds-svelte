# Changelog

All notable changes to `@arraypress/waveform-sounds-svelte` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

## [0.1.0] — 2026-10-06

### Added

- First release: `<WaveformSounds>`, a Svelte 5 (runes) component for
  `@arraypress/waveform-sounds` 0.1.0.
- Every `WaveformSoundsOptions` key is a typed prop, derived from the
  core's `index.d.ts`, and forwarded through an explicit allowlist. A
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
