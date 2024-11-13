/**
 * FingerprintJS v3.4.2 - Copyright (c) FingerprintJS, Inc, 2024 (https://fingerprint.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * This software contains code from open-source projects:
 * MurmurHash3 by Karan Lyons (https://github.com/karanlyons/murmurHash3.js)
 */
// @ts-nocheck
type MaybePromise<T> = Promise<T> | T;

/**
 * A functions that returns data with entropy to identify visitor.
 *
 * See https://github.com/fingerprintjs/fingerprintjs/blob/master/contributing.md#how-to-make-an-entropy-source
 * to learn how entropy source works and how to make your own.
 */
type Source<TOptions, TValue> = (
	options: TOptions,
) => MaybePromise<TValue | (() => MaybePromise<TValue>)>;
/**
 * Generic dictionary of unknown sources
 */
type UnknownSources<TOptions> = Record<string, Source<TOptions, unknown>>;
/**
 * Converts an entropy source type into the component type
 */
type SourceValue<TSource extends Source<any, any>> = TSource extends Source<
	any,
	infer T
>
	? T
	: never;
/**
 * Result of getting entropy data from a source
 */
type Component<T> = (
	| {
			value: T;
			error?: undefined;
	  }
	| {
			value?: undefined;
			error:
				| Error
				| {
						message: unknown;
				  };
	  }
) & {
	duration: number;
};
/**
 * Generic dictionary of unknown components
 */
type UnknownComponents = Record<string, Component<unknown>>;
/**
 * Converts an entropy source list type to a corresponding component list type.
 *
 * Warning for package users:
 * This type is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
type SourcesToComponents<TSources extends UnknownSources<any>> = {
	[K in keyof TSources]: Component<SourceValue<TSources[K]>>;
};
/**
 * Loads the given entropy sources. Returns a function that collects the entropy components.
 *
 * The result is returned synchronously in order to allow start getting the components
 * before the sources are loaded completely.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function loadSources<
	TSourceOptions,
	TSources extends UnknownSources<TSourceOptions>,
	TExclude extends string,
>(
	sources: TSources,
	sourceOptions: TSourceOptions,
	excludeSources: readonly TExclude[],
): () => Promise<Omit<SourcesToComponents<TSources>, TExclude>>;
/**
 * Modifies an entropy source by transforming its returned value with the given function.
 * Keeps the source properties: sync/async, 1/2 stages.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function transformSource<TOptions, TValueBefore, TValueAfter>(
	source: Source<TOptions, TValueBefore>,
	transformValue: (value: TValueBefore) => TValueAfter,
): Source<TOptions, TValueAfter>;

/**
 * A deep description: https://fingerprint.com/blog/audio-fingerprinting/
 * Inspired by and based on https://github.com/cozylife/audio-fingerprint
 */
declare function getAudioFingerprint(): number | (() => Promise<number>);

declare function getFonts(): Promise<string[]>;

type PluginMimeTypeData = {
	type: string;
	suffixes: string;
};
type PluginData = {
	name: string;
	description: string;
	mimeTypes: PluginMimeTypeData[];
};
declare function getPlugins(): PluginData[] | undefined;

interface CanvasFingerprint {
	winding: boolean;
	geometry: string;
	text: string;
}
declare function getCanvasFingerprint(): CanvasFingerprint;

type TouchSupport = {
	maxTouchPoints: number;
	/** The success or failure of creating a TouchEvent */
	touchEvent: boolean;
	/** The availability of the "ontouchstart" property */
	touchStart: boolean;
};
/**
 * This is a crude and primitive touch screen detection. It's not possible to currently reliably detect the availability
 * of a touch screen with a JS, without actually subscribing to a touch event.
 *
 * @see http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
 * @see https://github.com/Modernizr/Modernizr/issues/548
 */
declare function getTouchSupport(): TouchSupport;

declare function getOsCpu(): string | undefined;

declare function getLanguages(): string[][];

declare function getColorDepth(): number;

declare function getDeviceMemory(): number | undefined;

declare function getScreenResolution(): [number | null, number | null];

/**
 * The order matches the CSS side order: top, right, bottom, left.
 *
 * @ignore Named array elements aren't used because of multiple TypeScript compatibility complaints from users
 */
type FrameSize = [number | null, number | null, number | null, number | null];
declare function getScreenFrame(): () => Promise<FrameSize>;
/**
 * Sometimes the available screen resolution changes a bit, e.g. 1900x1440 → 1900x1439. A possible reason: macOS Dock
 * shrinks to fit more icons when there is too little space. The rounding is used to mitigate the difference.
 */
declare function getRoundedScreenFrame(): () => Promise<FrameSize>;

declare function getHardwareConcurrency(): number | undefined;

declare function getTimezone(): string;

declare function getSessionStorage(): boolean;

declare function getLocalStorage(): boolean;

declare function getIndexedDB(): boolean | undefined;

declare function getOpenDatabase(): boolean;

declare function getCpuClass(): string | undefined;

declare function getPlatform(): string;

declare function getVendor(): string;

/**
 * Checks for browser-specific (not engine specific) global variables to tell browsers with the same engine apart.
 * Only somewhat popular browsers are considered.
 */
declare function getVendorFlavors(): string[];

/**
 * navigator.cookieEnabled cannot detect custom or nuanced cookie blocking configurations. For example, when blocking
 * cookies via the Advanced Privacy Settings in IE9, it always returns true. And there have been issues in the past with
 * site-specific exceptions. Don't rely on it.
 *
 * @see https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cookies.js Taken from here
 */
declare function areCookiesEnabled(): boolean;

type Options = {
	debug?: boolean;
};
/**
 * The order of the returned array means nothing (it's always sorted alphabetically).
 *
 * Notice that the source is slightly unstable.
 * Safari provides a 2-taps way to disable all content blockers on a page temporarily.
 * Also content blockers can be disabled permanently for a domain, but it requires 4 taps.
 * So empty array shouldn't be treated as "no blockers", it should be treated as "no signal".
 * If you are a website owner, don't make your visitors want to disable content blockers.
 */
declare function getDomBlockers({
	debug,
}?: Options): Promise<string[] | undefined>;

type ColorGamut = "srgb" | "p3" | "rec2020";
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/color-gamut
 */
declare function getColorGamut(): ColorGamut | undefined;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/inverted-colors
 */
declare function areColorsInverted(): boolean | undefined;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
 */
declare function areColorsForced(): boolean | undefined;

/**
 * If the display is monochrome (e.g. black&white), the value will be ≥0 and will mean the number of bits per pixel.
 * If the display is not monochrome, the returned value will be 0.
 * If the browser doesn't support this feature, the returned value will be undefined.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/monochrome
 */
declare function getMonochromeDepth(): number | undefined;

/**
 * @see https://www.w3.org/TR/mediaqueries-5/#prefers-contrast
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
 */
declare function getContrastPreference(): number | undefined;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
 */
declare function isMotionReduced(): boolean | undefined;

/**
 * @see https://www.w3.org/TR/mediaqueries-5/#dynamic-range
 */
declare function isHDR(): boolean | undefined;

/**
 * @see https://gitlab.torproject.org/legacy/trac/-/issues/13018
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=531915
 */
declare function getMathFingerprint(): Record<string, number>;

/**
 * The result is a dictionary of the width of the text samples.
 * Heights aren't included because they give no extra entropy and are unstable.
 *
 * The result is very stable in IE 11, Edge 18 and Safari 14.
 * The result changes when the OS pixel density changes in Chromium 87. The real pixel density is required to solve,
 * but seems like it's impossible: https://stackoverflow.com/q/1713771/1118709.
 * The "min" and the "mono" (only on Windows) value may change when the page is zoomed in Firefox 87.
 */
declare function getFontPreferences(): Promise<Record<string, number>>;

interface VideoCard {
	vendor: string;
	renderer: string;
}
/**
 * @see Credits: https://stackoverflow.com/a/49267844
 */
declare function getVideoCard(): VideoCard | undefined;

declare function isPdfViewerEnabled(): boolean | undefined;

/**
 * Unlike most other architectures, on x86/x86-64 when floating-point instructions
 * have no NaN arguments, but produce NaN output, the output NaN has sign bit set.
 * We use it to distinguish x86/x86-64 from other architectures, by doing subtraction
 * of two infinities (must produce NaN per IEEE 754 standard).
 *
 * See https://codebrowser.bddppq.com/pytorch/pytorch/third_party/XNNPACK/src/init.c.html#79
 */
declare function getArchitecture(): number;

/**
 * The list of entropy sources used to make visitor identifiers.
 *
 * This value isn't restricted by Semantic Versioning, i.e. it may be changed without bumping minor or major version of
 * this package.
 *
 * Note: Rollup and Webpack are smart enough to remove unused properties of this object during tree-shaking, so there is
 * no need to export the sources individually.
 */
declare const sources: {
	fonts: typeof getFonts;
	domBlockers: typeof getDomBlockers;
	fontPreferences: typeof getFontPreferences;
	audio: typeof getAudioFingerprint;
	screenFrame: typeof getRoundedScreenFrame;
	osCpu: typeof getOsCpu;
	languages: typeof getLanguages;
	colorDepth: typeof getColorDepth;
	deviceMemory: typeof getDeviceMemory;
	screenResolution: typeof getScreenResolution;
	hardwareConcurrency: typeof getHardwareConcurrency;
	timezone: typeof getTimezone;
	sessionStorage: typeof getSessionStorage;
	localStorage: typeof getLocalStorage;
	indexedDB: typeof getIndexedDB;
	openDatabase: typeof getOpenDatabase;
	cpuClass: typeof getCpuClass;
	platform: typeof getPlatform;
	plugins: typeof getPlugins;
	canvas: typeof getCanvasFingerprint;
	touchSupport: typeof getTouchSupport;
	vendor: typeof getVendor;
	vendorFlavors: typeof getVendorFlavors;
	cookiesEnabled: typeof areCookiesEnabled;
	colorGamut: typeof getColorGamut;
	invertedColors: typeof areColorsInverted;
	forcedColors: typeof areColorsForced;
	monochrome: typeof getMonochromeDepth;
	contrast: typeof getContrastPreference;
	reducedMotion: typeof isMotionReduced;
	hdr: typeof isHDR;
	math: typeof getMathFingerprint;
	videoCard: typeof getVideoCard;
	pdfViewerEnabled: typeof isPdfViewerEnabled;
	architecture: typeof getArchitecture;
};
/**
 * List of components from the built-in entropy sources.
 *
 * Warning! This type is out of Semantic Versioning, i.e. may have incompatible changes within a major version. If you
 * want to avoid breaking changes, use `UnknownComponents` instead that is more generic but guarantees backward
 * compatibility within a major version. This is because browsers change constantly and therefore entropy sources have
 * to change too.
 */
type BuiltinComponents = SourcesToComponents<typeof sources>;

interface Confidence {
	/**
	 * A number between 0 and 1 that tells how much the agent is sure about the visitor identifier.
	 * The higher the number, the higher the chance of the visitor identifier to be true.
	 */
	score: number;
	/**
	 * Additional details about the score as a human-readable text
	 */
	comment?: string;
}

interface MerkleNodeInterface {
	hash: string;
	parent: string | null;
}
type MerkleLeaf = string;
type MerkleLayer = MerkleLeaf[];
type MerkleProofLayer = [MerkleLeaf, MerkleLeaf];
type MerkleRootLayer = [MerkleLeaf];
type MerkleProof = [...MerkleProofLayer[], MerkleRootLayer];
declare class MerkleNode implements MerkleNodeInterface {
	hash: string;
	parent: string | null;
	constructor(hash: string);
}
declare class CaptchaMerkleTree {
	leaves: MerkleNode[];
	layers: MerkleLayer[];
	root: MerkleNode | undefined;
	constructor();
	getRoot(): MerkleNode;
	build(leaves: string[]): void;
	buildMerkleTree(leaves: MerkleNode[]): MerkleNode[];
	createParent(leftChild: MerkleNode, rightChild: MerkleNode): MerkleNode;
	proof(leafHash: MerkleLeaf): MerkleProof;
}

/**
 * Options for Fingerprint class loading
 */
interface LoadOptions {
	/**
	 * When browser doesn't support `requestIdleCallback` a `setTimeout` will be used. This number is only for Safari and
	 * old Edge, because Chrome/Blink based browsers support `requestIdleCallback`. The value is in milliseconds.
	 * @default 50
	 */
	delayFallback?: number;
	/**
	 * Whether to print debug messages to the console.
	 * Required to ease investigations of problems.
	 */
	debug?: boolean;
	/**
	 * Set `false` to disable the unpersonalized AJAX request that the agent sends to collect installation statistics.
	 * It's always disabled in the version published to the FingerprintJS CDN.
	 */
	monitoring?: boolean;
}
/**
 * Options for getting visitor identifier
 */
interface GetOptions {
	/**
	 * Whether to print debug messages to the console.
	 *
	 * @deprecated Use the `debug` option of `load()` instead
	 */
	debug?: boolean;
}
/**
 * Result of getting a visitor identifier
 */
interface GetResult {
	/**
	 * The visitor identifier
	 */
	visitorId: string;
	/**
	 * A confidence score that tells how much the agent is sure about the visitor identifier
	 */
	confidence: Confidence;
	/**
	 * List of components that has formed the visitor identifier.
	 *
	 * Warning! The type of this property is specific but out of Semantic Versioning, i.e. may have incompatible changes
	 * within a major version. If you want to avoid breaking changes, treat the property as having type
	 * `UnknownComponents` that is more generic but guarantees backward compatibility within a major version.
	 */
	components: BuiltinComponents;
	/**
	 * The fingerprinting algorithm version
	 *
	 * @see https://github.com/fingerprintjs/fingerprintjs#version-policy For more details
	 */
	version: string;
	/**
	 * The tree used to calculate the visitor identifier
	 */
	tree: CaptchaMerkleTree;
}
/**
 * Agent object that can get visitor identifier
 */
interface Agent {
	/**
	 * Gets the visitor identifier
	 */
	get(options?: Readonly<GetOptions>): Promise<GetResult>;
}
declare function componentsToDebugString(components: UnknownComponents): string;
declare function hashComponents(components: UnknownComponents): string;
/**
 * A delay is required to ensure consistent entropy components.
 * See https://github.com/fingerprintjs/fingerprintjs/issues/254
 * and https://github.com/fingerprintjs/fingerprintjs/issues/307
 * and https://github.com/fingerprintjs/fingerprintjs/commit/945633e7c5f67ae38eb0fea37349712f0e669b18
 */
declare function prepareForSources(delayFallback?: number): Promise<void>;
/**
 * Builds an instance of Agent and waits a delay required for a proper operation.
 */
declare function load({
	delayFallback,
	debug,
	monitoring,
}?: Readonly<LoadOptions>): Promise<Agent>;

declare function x64hash128(key: string, seed?: number): string;

/**
 * Checks whether the browser is based on Trident (the Internet Explorer engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isTrident(): boolean;
/**
 * Checks whether the browser is based on EdgeHTML (the pre-Chromium Edge engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isEdgeHTML(): boolean;
/**
 * Checks whether the browser is based on Chromium without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isChromium(): boolean;
/**
 * Checks whether the browser is based on mobile or desktop Safari without using user-agent.
 * All iOS browsers use WebKit (the Safari engine).
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isWebKit(): boolean;
/**
 * Checks whether the WebKit browser is a desktop Safari.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isDesktopSafari(): boolean;
/**
 * Checks whether the browser is based on Gecko (Firefox engine) without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isGecko(): boolean;
/**
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function getFullscreenElement(): Element | null;
/**
 * Checks whether the device runs on Android without using user-agent.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function isAndroid(): boolean;

/**
 * Creates and keeps an invisible iframe while the given function runs.
 * The given function is called when the iframe is loaded and has a body.
 * The iframe allows to measure DOM sizes inside itself.
 *
 * Notice: passing an initial HTML code doesn't work in IE.
 *
 * Warning for package users:
 * This function is out of Semantic Versioning, i.e. can change unexpectedly. Usage is at your own risk.
 */
declare function withIframe<T>(
	action: (iframe: HTMLIFrameElement, iWindow: Window) => MaybePromise<T>,
	initialHtml?: string,
	domPollInterval?: number,
): Promise<T>;

declare const _default: {
	load: typeof load;
	hashComponents: typeof hashComponents;
	componentsToDebugString: typeof componentsToDebugString;
};

/** Not documented, out of Semantic Versioning, usage is at your own risk */
declare const murmurX64Hash128: typeof x64hash128;

export {
	type Agent,
	type BuiltinComponents,
	type Component,
	type Confidence,
	type GetOptions,
	type GetResult,
	type LoadOptions,
	type Source,
	type SourcesToComponents,
	type UnknownComponents,
	type UnknownSources,
	componentsToDebugString,
	_default as default,
	getFullscreenElement,
	getScreenFrame,
	hashComponents,
	isAndroid,
	isChromium,
	isDesktopSafari,
	isEdgeHTML,
	isGecko,
	isTrident,
	isWebKit,
	load,
	loadSources,
	murmurX64Hash128,
	prepareForSources,
	sources,
	transformSource,
	withIframe,
};
