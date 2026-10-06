<!--
  WaveformSounds.svelte
  ---------------------

  Svelte 5 wrapper around `@arraypress/waveform-sounds`. Renders a host
  `<div>` whose content is the core's own markup — `renderSounds()` from the
  DOM-free `@arraypress/waveform-sounds/render` — then, on mount, constructs
  a `WaveformSounds` over that host. The runtime ADOPTS markup it finds
  (`[data-ws-list]`) instead of rebuilding it, so with `sounds` the list is
  server-rendered, readable and crawlable before any script runs, and
  hydration keeps those nodes. With `manifest` instead, the host renders
  empty and the runtime fetches + renders in the browser.

  Why `{@html}`? The markup is the contract between the core's renderer and
  its runtime (every class and `data-ws-*` attribute is read back), so the
  wrapper emits exactly what the core renders rather than re-implementing
  it in Svelte. As the host's only child, `{@html}` is "controlled": Svelte
  writes `host.innerHTML` directly and keeps no anchor node inside, so the
  runtime may freely rewrite the inside (it does, in `manifest` mode).

  Any change to `sounds` or a construction option destroys and rebuilds the
  instance (like the playlist / player wrappers — simpler than diffing every
  option). Before a rebuild the host's content is reset to a fresh render,
  so the new instance never adopts rows the old one re-sorted, hid or
  painted. The host deliberately does NOT carry `data-waveform-sounds` —
  that attribute drives the core's *global* auto-init, which would
  double-mount on top of the instance this component owns.

  Library setup — import BOTH stylesheets ONCE in your app entry; this
  component does NOT import them for you:

      import '@arraypress/waveform-player/styles.css';
      import '@arraypress/waveform-sounds/styles.css';

  The list plays every sound through one `WaveformPlayer`, constructed from
  `window.WaveformPlayer` on first play, so register the player core once:

      import '@arraypress/waveform-player'; // registers window.WaveformPlayer

  (or pass the class as `playerClass`). The runtime's JS is imported
  dynamically inside a `$effect` (browser-only), so SSR only ever evaluates
  the DOM-free renderer.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { renderSounds } from '@arraypress/waveform-sounds/render';
	import type { SoundsFilter, SoundsSort, WaveformSounds as WaveformSoundsCore } from '@arraypress/waveform-sounds';
	import type { Sound, WaveformSoundsCallbacks, WaveformSoundsProps } from './types.js';

	type SoundsCtor = new (el: HTMLElement, opts: Record<string, unknown>) => WaveformSoundsCore;

	/* The lowercase callback props replace the host's same-named native
	 * handlers (`onplay`, `onpause`, `onerror` are media events, never fired
	 * on a `<div>`), so their types don't intersect. `instance` is bindable. */
	type Props = WaveformSoundsProps &
		WaveformSoundsCallbacks &
		Omit<HTMLAttributes<HTMLDivElement>, keyof WaveformSoundsCallbacks> & {
			/** The core instance, `null` until mounted. Use `bind:instance`. */
			instance?: WaveformSoundsCore | null;
		};

	let {
		// ── Data (rendered into the host as markup, and forwarded) ──────
		sounds,
		manifest,
		// ── Layout + toolbar (these shape the rendered markup) ──────────
		player,
		search,
		filters,
		sorts,
		showCount,
		menuSearch,
		loopToggle,
		maxTypeChips,
		pageSize,
		columns,
		strings,
		// ── Row waveform ─────────────────────────────────────────────────
		waveformStyle,
		waveformColor,
		progressColor,
		barWidth,
		barGap,
		// ── Behaviour ────────────────────────────────────────────────────
		loop,
		autoAdvance,
		arrowAudition,
		// ── Engine (the one WaveformPlayer) ──────────────────────────────
		playerOptions,
		playerClass,
		// ── Lifecycle callbacks ──────────────────────────────────────────
		onready,
		onplay,
		onpause,
		onend,
		onfilter,
		onerror,
		// ── Instance (bindable) ──────────────────────────────────────────
		instance = $bindable(null),
		// ── Host element ─────────────────────────────────────────────────
		class: className = '',
		...rest
	}: Props = $props();

	let container: HTMLDivElement;
	/* Non-reactive handle: the methods below use it, and the mount effect
	 * must not depend on it. `instance` mirrors it for `bind:instance`. */
	let live: WaveformSoundsCore | null = null;
	/* Set once an instance has lived on the host: from then on, a (re)mount
	 * resets the host's content to a fresh render before constructing. */
	let hosted = false;

	/**
	 * The core's markup for `sounds` — what the server sends and the runtime
	 * adopts. Empty without `sounds` (a `manifest` is fetched in the
	 * browser). Reads `sounds` deeply, so a mutated `$state` array re-renders.
	 * A render that throws (malformed sounds) degrades to an empty host the
	 * runtime then fills — or reports through `onerror` — rather than
	 * failing the whole server render.
	 */
	const markup = $derived.by(() => {
		if (!Array.isArray(sounds)) return '';
		try {
			return renderSounds(sounds, {
				player,
				search,
				filters,
				sorts,
				showCount,
				menuSearch,
				loopToggle,
				maxTypeChips,
				pageSize,
				columns,
				strings,
			});
		} catch (err) {
			console.error('[WaveformSoundsSvelte] Failed to render sounds:', err);
			return '';
		}
	});

	/*
	 * Host `class` handling (as in the playlist wrapper).
	 *
	 * The runtime owns part of the host's class list — `waveform-sounds` and
	 * `waveform-sounds--inline|strip`. If Svelte owned the `class` attribute,
	 * a class-only change — which rightly doesn't rebuild — would rewrite it
	 * and strip those for good. So the markup binds a class value frozen at
	 * init (which also carries the runtime's classes, so server-rendered
	 * markup is styled before hydration); later `class` changes are applied
	 * with `classList`, touching only the tokens this component put there.
	 */
	const hostClass = $derived(`wfs-host ${className ?? ''}`.trim());
	const renderedClass = untrack(
		() => `waveform-sounds waveform-sounds--${player === 'strip' ? 'strip' : 'inline'} ${hostClass}`
	);
	let appliedClasses = classTokens(untrack(() => hostClass));

	/** Split a class string into its tokens (empty strings dropped). */
	function classTokens(value: string): string[] {
		return value.split(/\s+/).filter(Boolean);
	}

	$effect(() => {
		const wanted = classTokens(hostClass);
		if (!container) return;
		for (const token of appliedClasses) {
			if (!wanted.includes(token)) container.classList.remove(token);
		}
		if (wanted.length) container.classList.add(...wanted);
		appliedClasses = wanted;
	});

	/* Monotonic token: every (re)mount bumps it; an in-flight async import
	 * whose token is stale bails instead of attaching a zombie. */
	let token = 0;

	/** Read a value deeply so nested `$state` changes are tracked. */
	function deep(value: unknown): void {
		try {
			JSON.stringify(value);
		} catch {
			/* circular / exotic: the reference is still tracked */
		}
	}

	/**
	 * Map the current props into the constructor's option shape. Every
	 * forwarded prop is read here, synchronously, so the mount effect
	 * re-runs when any of them changes. Unset props are omitted so the
	 * core's defaults (and `data-*` on the host) win.
	 */
	function buildOptions(): Record<string, unknown> {
		const opts: Record<string, unknown> = {};
		const set = (key: string, value: unknown) => {
			if (value !== undefined && value !== null) opts[key] = value;
		};
		deep(filters);
		deep(sorts);
		deep(columns);
		deep(strings);
		deep(playerOptions);

		set('sounds', sounds);
		set('manifest', manifest);

		set('player', player);
		set('search', search);
		set('filters', filters);
		set('sorts', sorts);
		set('showCount', showCount);
		set('menuSearch', menuSearch);
		set('loopToggle', loopToggle);
		set('maxTypeChips', maxTypeChips);
		set('pageSize', pageSize);
		set('columns', columns);
		set('strings', strings);

		set('waveformStyle', waveformStyle);
		set('waveformColor', waveformColor);
		set('progressColor', progressColor);
		set('barWidth', barWidth);
		set('barGap', barGap);

		set('loop', loop);
		set('autoAdvance', autoAdvance);
		set('arrowAudition', arrowAudition);

		set('playerOptions', playerOptions);
		set('playerClass', playerClass);

		return opts;
	}

	/**
	 * A stable callback for the core that calls whatever handler `get`
	 * returns at call time, with every argument the core passes.
	 */
	function forward(get: () => ((...args: never[]) => void) | undefined) {
		return (...args: unknown[]) => (get() as ((...a: unknown[]) => void) | undefined)?.(...args);
	}

	function teardown() {
		if (live) {
			try {
				live.destroy();
			} catch (err) {
				console.warn('[WaveformSoundsSvelte] destroy() threw:', err);
			}
		}
		live = null;
		instance = null;
	}

	function mount(opts: Record<string, unknown>, html: string) {
		const my = ++token;
		if (!container) return;

		import('@arraypress/waveform-sounds/no-autoinit')
			.then((mod) => {
				if (my !== token || !container) return;

				const Ctor = (mod.default ??
					(mod as { WaveformSounds?: unknown }).WaveformSounds) as unknown as SoundsCtor;
				if (typeof Ctor !== 'function') {
					console.error('[WaveformSoundsSvelte] Failed to resolve the WaveformSounds constructor from the module.');
					return;
				}

				/* A previous instance re-sorted, hid and painted the rows it
				 * adopted (or restored the host on destroy): hand the new one a
				 * fresh render, as the server would. */
				if (hosted) container.innerHTML = html;

				/* Wire callbacks. The props are reactive and read at call
				 * time, so the closures always reach the latest handler
				 * without a rebuild. */
				opts.onReady = forward(() => onready);
				opts.onPlay = forward(() => onplay);
				opts.onPause = forward(() => onpause);
				opts.onEnd = forward(() => onend);
				opts.onFilter = forward(() => onfilter);
				opts.onError = forward(() => onerror);

				try {
					live = new Ctor(container, opts);
					hosted = true;
					instance = live;
				} catch (err) {
					console.error('[WaveformSoundsSvelte] Failed to construct WaveformSounds:', err);
				}
			})
			.catch((err) => {
				console.error('[WaveformSoundsSvelte] Failed to load library:', err);
			});
	}

	/* Mount / rebuild lifecycle. `markup` (which reads `sounds` deeply) and
	 * `buildOptions()` (every construction option) are read synchronously, so
	 * the effect re-runs — and rebuilds — when either changes. Callback props
	 * and `class` are not read here, so they never rebuild. Browser-only: SSR
	 * renders just the host and its markup. */
	$effect(() => {
		const html = markup;
		const opts = buildOptions();
		untrack(() => {
			teardown();
			mount(opts, html);
		});
		return () => {
			token += 1;
			untrack(teardown);
		};
	});

	/* Imperative API — reachable via `bind:this`. Thin pass-throughs;
	 * calls before the async instance mounts are safe no-ops. */
	export function play(target?: number | string | Sound, opts?: { at?: number }): void {
		live?.play(target, opts);
	}
	export function pause(): void {
		live?.pause();
	}
	export function toggle(target?: number | string | Sound): void {
		live?.toggle(target);
	}
	export function next(): void {
		live?.next();
	}
	export function previous(): void {
		live?.previous();
	}
	export function setLoop(on: boolean): void {
		live?.setLoop(on);
	}
	export function setFilter(patch: Partial<SoundsFilter>): void {
		live?.setFilter(patch);
	}
	export function clearFilters(): void {
		live?.clearFilters();
	}
	export function setSort(by: SoundsSort): void {
		live?.setSort(by);
	}
	export function showMore(): void {
		live?.showMore();
	}
	export function getInstance(): WaveformSoundsCore | null {
		return live;
	}
</script>

<!-- `class` is frozen at init — see "Host `class` handling" above. -->
<div bind:this={container} class={renderedClass} {...rest}>{@html markup}</div>
