# CLAUDE.md — @arraypress/waveform-sounds-svelte

Svelte 5 (runes) wrapper for `@arraypress/waveform-sounds`. Renders the core's
own markup into a host `<div>` with `{@html}` and constructs `WaveformSounds`
over it; the runtime adopts that markup.

## Commands
- `npm test` — vitest + jsdom (run before committing). `integration.test.ts`
  and `hydration.test.ts` use the REAL core runtime; the rest mock it.
- `npm run typecheck` — svelte-check (also checks `test/types.typecheck.ts`).
- `npm run build` — svelte-package to `dist/`. `prepublishOnly` runs it. `dist/` is gitignored.

## ⚠ Local-dev dependency — switch before publishing
The core is an ordinary `^0.1.0` devDependency installed from npm. (Until 0.1.0 was published on 2026-10-07 it was a `file:../waveform-sounds` symlink, which needed a Vite `server.fs.allow` exception; both are gone.)

## The rule that matters: an undestructured prop vanishes
`src/lib/WaveformSounds.svelte`. A new core option needs:
1. Add it to the `$props()` destructure.
2. `set('<key>', <key>);` in `buildOptions()`.
3. If it shapes the markup (it's in the core's `RENDER_DEFAULTS` / read by
   `renderSounds`), also pass it to `renderSounds()` in `markup`.

Step 1 is the trap: an undestructured prop falls into `...rest`, lands on the
host as an attribute, and is **never forwarded** — it typechecks clean.
`test/forwarding-drift.test.ts` reads the core's `index.d.ts` and fails until
the key is forwarded or listed in `NOT_FORWARDED` with a reason. Object/array
options whose `__key__` sentinel would break `renderSounds` go in its `SAMPLES`.

## How the host works (don't "simplify" these)
- `{@html markup}` is the host's ONLY child → Svelte uses *controlled* html
  (`host.innerHTML = …`, no anchor nodes), so the runtime may rewrite the
  inside (it does in `manifest` mode). Add a sibling node and that breaks.
- No `data-waveform-sounds` on the host — that's the global auto-init marker.
- A rebuild resets `innerHTML` to a fresh render (`hosted` flag) before
  constructing; the FIRST mount must not, or hydration's nodes are replaced
  (`hydration.test.ts` catches it).
- `class` is frozen at init and later changes go through `classList`
  (same as the playlist wrapper) so the runtime's `waveform-sounds*` classes
  survive a class-only change.
- Callbacks + `class` are not read in the mount effect, so they never rebuild.
- `idPrefix` defaults to host `id`, else `$props.id()` (SSR/hydration-stable,
  unique per instance). That is why the svelte peer floor is `^5.20.0` —
  verified against the tarballs: 5.19.10 has no `$props.id`, 5.20.0 does.

## Test gotcha
In the MOCKED suites, render lists one at a time (await the first construct):
two concurrent dynamic imports of the vi.mock'ed core can hand the second
component the REAL module. Not a wrapper bug — `integration.test.ts` mounts two
lists concurrently against the real core.

## Conventions
- Types derive from the core's hand-written `index.d.ts`; never re-declare them.
- TS stays on `^6` (svelte-check 4 peer cap; see the waveform-release skill).
  TS 6 no longer auto-includes `@types/*`, hence the `/// <reference types="node" />`
  in `hydration.test.ts`.
- Add a test under `test/` + a `CHANGELOG.md` entry.

## Cross-repo
One of the four `waveform-sounds-*` wrappers. Not yet in the `waveform-release`
skill's package list — add the sounds core + wrappers there on first publish.
