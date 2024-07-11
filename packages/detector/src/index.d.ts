// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
export interface DetectorResult {
    fingerprint: Fingerprint;
    isBotBotD: IsBotBotD;
    botScore: number;
    isBot: boolean;
    botType: any;
}

export interface Fingerprint {
    resistance: Resistance;
    headlessFeaturesFingerprint: HeadlessFeaturesFingerprint;
    audioFingerprint: AudioFingerprint;
    mathFingerprint: MathFingerprint;
    canvasFingerprint: CanvasFingerprint;
    CSSFingerprint: CSSFingerprint;
    CSSMediaFingerprint: CSSMediaFingerprint;
    documentFingerprint: DocumentFingerprint;
    domRectFingerprint: DOMRectFingerprint;
    errorsFingerprint: ErrorsFingerprint;
    fontsFingerprint: FontsFingerprint;
    intlFingerprint: IntlFingerprint;
    mediaFingerprint: MediaFingerprint;
    resistanceFingerprint: Resistance;
    screenFingerprint: ScreenFingerprint;
    voiceFingerprint: null;
    SVGFingerprint: SVGFingerprint;
    timezoneFingerprint: TimezoneFingerprint;
    canvasWebglFingerprint: CanvasWebglFingerprint;
    mediaCapabilities: { [key: string]: string[] };
    webRTCData: WebRTCData;
    windowFeatures: WindowFeatures;
}

export interface CSSFingerprint {
    computedStyle: ComputedStyle;
    system: System;
}

export interface ComputedStyle {
    keys: string[];
    interfaceName: string;
}

export interface System {
    colors: Color[];
    fonts: Font[];
}

export interface Color {
    ActiveBorder?: string;
    ActiveCaption?: string;
    ActiveText?: string;
    AppWorkspace?: string;
    Background?: string;
    ButtonBorder?: string;
    ButtonFace?: string;
    ButtonHighlight?: string;
    ButtonShadow?: string;
    ButtonText?: string;
    Canvas?: string;
    CanvasText?: string;
    CaptionText?: string;
    Field?: string;
    FieldText?: string;
    GrayText?: string;
    Highlight?: string;
    HighlightText?: string;
    InactiveBorder?: string;
    InactiveCaption?: string;
    InactiveCaptionText?: string;
    InfoBackground?: string;
    InfoText?: string;
    LinkText?: string;
    Mark?: string;
    MarkText?: string;
    Menu?: string;
    MenuText?: string;
    Scrollbar?: string;
    ThreeDDarkShadow?: string;
    ThreeDFace?: string;
    ThreeDHighlight?: string;
    ThreeDLightShadow?: string;
    ThreeDShadow?: string;
    VisitedText?: string;
    Window?: string;
    WindowFrame?: string;
    WindowText?: string;
}

export interface Font {
    caption?: string;
    icon?: string;
    menu?: string;
    "message-box"?: string;
    "small-caption"?: string;
    "status-bar"?: string;
}

export interface CSSMediaFingerprint {
    mediaCSS: MediaCSS;
    matchMediaCSS: MediaCSS;
    screenQuery: ScreenQuery;
}

export interface MediaCSS {
    "prefers-reduced-motion": string;
    "prefers-color-scheme": string;
    monochrome: string;
    "forced-colors": string;
    "any-hover": string;
    hover: string;
    "any-pointer": string;
    pointer: string;
    "device-aspect-ratio": string;
    "device-screen": string;
    "display-mode": string;
    "color-gamut": string;
    orientation: string;
}

export interface ScreenQuery {
    width: number;
    height: number;
}

export interface SVGFingerprint {
    bBox: number;
    extentOfChar: number;
    subStringLength: number;
    computedTextLength: number;
    emojiSet: string[];
    svgrectSystemSum: number;
    lied: number;
}

export interface AudioFingerprint {
    totalUniqueSamples: number;
    compressorGainReduction: number;
    floatFrequencyDataSum: number;
    floatTimeDomainDataSum: number;
    sampleSum: number;
    binsSample: number[];
    copySample: number[];
    values: Values;
    noise: number;
    lied: boolean;
}

export interface Values {
    "AnalyserNode.channelCount": number;
    "AnalyserNode.channelCountMode": string;
    "AnalyserNode.channelInterpretation": string;
    "AnalyserNode.context.sampleRate": number;
    "AnalyserNode.fftSize": number;
    "AnalyserNode.frequencyBinCount": number;
    "AnalyserNode.maxDecibels": number;
    "AnalyserNode.minDecibels": number;
    "AnalyserNode.numberOfInputs": number;
    "AnalyserNode.numberOfOutputs": number;
    "AnalyserNode.smoothingTimeConstant": number;
    "AnalyserNode.context.listener.forwardX.maxValue": number;
    "BiquadFilterNode.gain.maxValue": number;
    "BiquadFilterNode.frequency.defaultValue": number;
    "BiquadFilterNode.frequency.maxValue": number;
    "DynamicsCompressorNode.attack.defaultValue": number;
    "DynamicsCompressorNode.knee.defaultValue": number;
    "DynamicsCompressorNode.knee.maxValue": number;
    "DynamicsCompressorNode.ratio.defaultValue": number;
    "DynamicsCompressorNode.ratio.maxValue": number;
    "DynamicsCompressorNode.release.defaultValue": number;
    "DynamicsCompressorNode.release.maxValue": number;
    "DynamicsCompressorNode.threshold.defaultValue": number;
    "DynamicsCompressorNode.threshold.minValue": number;
    "OscillatorNode.detune.maxValue": number;
    "OscillatorNode.detune.minValue": number;
    "OscillatorNode.frequency.defaultValue": number;
    "OscillatorNode.frequency.maxValue": number;
    "OscillatorNode.frequency.minValue": number;
}

export interface CanvasFingerprint {
    dataURI: string;
    paintURI: string;
    paintCpuURI: string;
    textURI: string;
    emojiURI: string;
    mods: Mods;
    textMetricsSystemSum: number;
    liedTextMetrics: number;
    emojiSet: string[];
    lied: number;
}

export interface Mods {
    pixelImage: string;
}

export interface CanvasWebglFingerprint {
    extensions: string[];
    pixels: number[];
    pixels2: number[];
    dataURI: string;
    dataURI2: string;
    parameters: Parameters;
    parameterOrExtensionLie: number;
    lied: number;
    gpu: GPU;
}

export interface GPU {
    parts: string;
    warnings: any[];
    gibbers: string;
    confidence: string;
    grade: string;
    compressedGPU: string;
}

export interface Parameters {
    ALIASED_POINT_SIZE_RANGE: number[];
    ALIASED_LINE_WIDTH_RANGE: number[];
    STENCIL_VALUE_MASK: number;
    STENCIL_WRITEMASK: number;
    STENCIL_BACK_VALUE_MASK: number;
    STENCIL_BACK_WRITEMASK: number;
    MAX_TEXTURE_SIZE: number;
    MAX_VIEWPORT_DIMS: number[];
    SUBPIXEL_BITS: number;
    MAX_VERTEX_ATTRIBS: number;
    MAX_VERTEX_UNIFORM_VECTORS: number;
    MAX_VARYING_VECTORS: number;
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: number;
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: number;
    MAX_TEXTURE_IMAGE_UNITS: number;
    MAX_FRAGMENT_UNIFORM_VECTORS: number;
    SHADING_LANGUAGE_VERSION: string;
    VENDOR: string;
    RENDERER: string;
    VERSION: string;
    MAX_CUBE_MAP_TEXTURE_SIZE: number;
    MAX_RENDERBUFFER_SIZE: number;
    UNMASKED_VENDOR_WEBGL: string;
    UNMASKED_RENDERER_WEBGL: string;
    MAX_3D_TEXTURE_SIZE: number;
    MAX_ELEMENTS_VERTICES: number;
    MAX_ELEMENTS_INDICES: number;
    MAX_TEXTURE_LOD_BIAS: number;
    MAX_DRAW_BUFFERS: number;
    MAX_FRAGMENT_UNIFORM_COMPONENTS: number;
    MAX_VERTEX_UNIFORM_COMPONENTS: number;
    MAX_ARRAY_TEXTURE_LAYERS: number;
    MAX_PROGRAM_TEXEL_OFFSET: number;
    MAX_VARYING_COMPONENTS: number;
    MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: number;
    MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: number;
    MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: number;
    MAX_COLOR_ATTACHMENTS: number;
    MAX_SAMPLES: number;
    MAX_VERTEX_UNIFORM_BLOCKS: number;
    MAX_FRAGMENT_UNIFORM_BLOCKS: number;
    MAX_COMBINED_UNIFORM_BLOCKS: number;
    MAX_UNIFORM_BUFFER_BINDINGS: number;
    MAX_UNIFORM_BLOCK_SIZE: number;
    MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: number;
    MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: number;
    MAX_VERTEX_OUTPUT_COMPONENTS: number;
    MAX_FRAGMENT_INPUT_COMPONENTS: number;
    MAX_SERVER_WAIT_TIMEOUT: number;
    MAX_ELEMENT_INDEX: number;
    MAX_CLIENT_WAIT_TIMEOUT_WEBGL: number;
    antialias: boolean;
    MAX_TEXTURE_MAX_ANISOTROPY_EXT: number;
    "VERTEX_SHADER.LOW_FLOAT.precision": number;
    "VERTEX_SHADER.LOW_FLOAT.rangeMax": number;
    "VERTEX_SHADER.LOW_FLOAT.rangeMin": number;
    "VERTEX_SHADER.MEDIUM_FLOAT.precision": number;
    "VERTEX_SHADER.MEDIUM_FLOAT.rangeMax": number;
    "VERTEX_SHADER.MEDIUM_FLOAT.rangeMin": number;
    "VERTEX_SHADER.HIGH_FLOAT.precision": number;
    "VERTEX_SHADER.HIGH_FLOAT.rangeMax": number;
    "VERTEX_SHADER.HIGH_FLOAT.rangeMin": number;
    "VERTEX_SHADER.HIGH_INT.precision": number;
    "VERTEX_SHADER.HIGH_INT.rangeMax": number;
    "VERTEX_SHADER.HIGH_INT.rangeMin": number;
    "FRAGMENT_SHADER.LOW_FLOAT.precision": number;
    "FRAGMENT_SHADER.LOW_FLOAT.rangeMax": number;
    "FRAGMENT_SHADER.LOW_FLOAT.rangeMin": number;
    "FRAGMENT_SHADER.MEDIUM_FLOAT.precision": number;
    "FRAGMENT_SHADER.MEDIUM_FLOAT.rangeMax": number;
    "FRAGMENT_SHADER.MEDIUM_FLOAT.rangeMin": number;
    "FRAGMENT_SHADER.HIGH_FLOAT.precision": number;
    "FRAGMENT_SHADER.HIGH_FLOAT.rangeMax": number;
    "FRAGMENT_SHADER.HIGH_FLOAT.rangeMin": number;
    "FRAGMENT_SHADER.HIGH_INT.precision": number;
    "FRAGMENT_SHADER.HIGH_INT.rangeMax": number;
    "FRAGMENT_SHADER.HIGH_INT.rangeMin": number;
    MAX_DRAW_BUFFERS_WEBGL: number;
}

export interface DocumentFingerprint {
    keys: string[];
}

export interface DOMRectFingerprint {
    elementClientRects: ClientRect[];
    elementBoundingClientRect: ClientRect[];
    rangeClientRects: ClientRect[];
    rangeBoundingClientRect: ClientRect[];
    emojiSet: string[];
    domrectSystemSum: number;
    lied: number;
}

export interface ClientRect {
    bottom: number;
    height: number;
    left: number;
    right: number;
    width: number;
    top: number;
    x: number;
    y: number;
}

export interface ErrorsFingerprint {
    errors: Error[];
}

export interface Error {
}

export interface FontsFingerprint {
    fontFaceLoadFonts: string[];
    apps: string[];
    emojiSet: string[];
    pixelSizeSystemSum: number;
    lied: number;
}

export interface HeadlessFeaturesFingerprint {
    chromium: boolean;
    likeHeadless: { [key: string]: boolean };
    headless: Headless;
    stealth: Stealth;
    likeHeadlessRating: number;
    headlessRating: number;
    stealthRating: number;
    systemFonts: string;
    platformEstimate: Array<PlatformEstimateClass | number>;
}

export interface Headless {
    webDriverIsOn: boolean;
    hasHeadlessUA: boolean;
    hasHeadlessWorkerUA: boolean;
}

export interface PlatformEstimateClass {
    Android: number;
    "Chrome OS": number;
    Windows: number;
    Mac: number;
    Linux: number;
}

export interface Stealth {
    hasIframeProxy: boolean;
    hasHighChromeIndex: boolean;
    hasBadChromeRuntime: boolean;
    hasToStringProxy: boolean;
}

export interface IntlFingerprint {
    dateTimeFormat: string;
    displayNames: string;
    listFormat: string;
    numberFormat: string;
    pluralRules: string;
    relativeTimeFormat: string;
    locale: string;
    lied: boolean;
}

export interface MathFingerprint {
    data: Data;
    lies: any[];
}

export interface Data {
    "acos(0.123)": Acos0123;
    "acos(Math.SQRT1_2)": Acos0123;
    "acosh(1e308)": Acos0123;
    "acosh(Math.PI)": Acos0123;
    "acosh(Math.SQRT2)": Acos0123;
    "asin(0.123)": Acos0123;
    "asinh(1e308)": Acos0123;
    "asinh(Math.PI)": Acos0123;
    "atan(2)": Acos0123;
    "atan(Math.PI)": Acos0123;
    "atanh(0.5)": Acos0123;
    "atan2(1e-310, 2)": Acos0123;
    "atan2(Math.PI)": Acos0123;
    "cbrt(100)": Acos0123;
    "cbrt(Math.PI)": Acos0123;
    "cos(0.123)": Acos0123;
    "cos(Math.PI)": Acos0123;
    "cos(5.860847362277284e+38)": Acos0123;
    "cos(-1e308)": Acos0123;
    "cos(13*Math.E)": Acos0123;
    "cos(57*Math.E)": Acos0123;
    "cos(21*Math.LN2)": Acos0123;
    "cos(51*Math.LN2)": Acos0123;
    "cos(21*Math.LOG2E)": Acos0123;
    "cos(25*Math.SQRT2)": Acos0123;
    "cos(50*Math.SQRT1_2)": Acos0123;
    "cos(21*Math.SQRT1_2)": Acos0123;
    "cos(17*Math.LOG10E)": Acos0123;
    "cos(2*Math.LOG10E)": Acos0123;
    "cosh(1)": Acos0123;
    "cosh(Math.PI)": Acos0123;
    "cosh(492*Math.LOG2E)": Acos0123;
    "cosh(502*Math.SQRT2)": Acos0123;
    "expm1(1)": Acos0123;
    "expm1(Math.PI)": Acos0123;
    "exp(0.123)": Acos0123;
    "exp(Math.PI)": Acos0123;
    "hypot(1, 2, 3, 4, 5, 6)": Acos0123;
    "hypot(5.860847362277284e+38, 5.860847362277284e+38)": Acos0123;
    "hypot(2*Math.E, -100)": Acos0123;
    "hypot(6*Math.PI, -100)": Acos0123;
    "hypot(2*Math.LN2, -100)": Acos0123;
    "hypot(Math.LOG2E, -100)": Acos0123;
    "hypot(Math.SQRT2, -100)": Acos0123;
    "hypot(Math.SQRT1_2, -100)": Acos0123;
    "hypot(2*Math.LOG10E, -100)": Acos0123;
    "log(0.123)": Acos0123;
    "log(Math.PI)": Acos0123;
    "log1p(0.123)": Acos0123;
    "log1p(Math.PI)": Acos0123;
    "log10(0.123)": Acos0123;
    "log10(Math.PI)": Acos0123;
    "log10(Math.E)": Acos0123;
    "log10(34*Math.E)": Acos0123;
    "log10(Math.LN2)": Acos0123;
    "log10(11*Math.LN2)": Acos0123;
    "log10(Math.LOG2E)": Acos0123;
    "log10(43*Math.LOG2E)": Acos0123;
    "log10(Math.LOG10E)": Acos0123;
    "log10(7*Math.LOG10E)": Acos0123;
    "log10(Math.SQRT1_2)": Acos0123;
    "log10(2*Math.SQRT1_2)": Acos0123;
    "log10(Math.SQRT2)": Acos0123;
    "sin(5.860847362277284e+38)": Acos0123;
    "sin(Math.PI)": Acos0123;
    "sin(39*Math.E)": Acos0123;
    "sin(35*Math.LN2)": Acos0123;
    "sin(110*Math.LOG2E)": Acos0123;
    "sin(7*Math.LOG10E)": Acos0123;
    "sin(35*Math.SQRT1_2)": Acos0123;
    "sin(21*Math.SQRT2)": Acos0123;
    "sinh(1)": Acos0123;
    "sinh(Math.PI)": Acos0123;
    "sinh(Math.E)": Acos0123;
    "sinh(Math.LN2)": Acos0123;
    "sinh(Math.LOG2E)": Acos0123;
    "sinh(492*Math.LOG2E)": Acos0123;
    "sinh(Math.LOG10E)": Acos0123;
    "sinh(Math.SQRT1_2)": Acos0123;
    "sinh(Math.SQRT2)": Acos0123;
    "sinh(502*Math.SQRT2)": Acos0123;
    "sqrt(0.123)": Acos0123;
    "sqrt(Math.PI)": Acos0123;
    "tan(-1e308)": Acos0123;
    "tan(Math.PI)": Acos0123;
    "tan(6*Math.E)": Acos0123;
    "tan(6*Math.LN2)": Acos0123;
    "tan(10*Math.LOG2E)": Acos0123;
    "tan(17*Math.SQRT2)": Acos0123;
    "tan(34*Math.SQRT1_2)": Acos0123;
    "tan(10*Math.LOG10E)": Acos0123;
    "tanh(0.123)": Acos0123;
    "tanh(Math.PI)": Acos0123;
    "pow(0.123, -100)": Acos0123;
    "pow(Math.PI, -100)": Acos0123;
    "pow(Math.E, -100)": Acos0123;
    "pow(Math.LN2, -100)": Acos0123;
    "pow(Math.LN10, -100)": Acos0123;
    "pow(Math.LOG2E, -100)": Acos0123;
    "pow(Math.LOG10E, -100)": Acos0123;
    "pow(Math.SQRT1_2, -100)": Acos0123;
    "pow(Math.SQRT2, -100)": Acos0123;
    "polyfill pow(2e-3, -100)": PolyfillPow2E3100;
}

export interface Acos0123 {
    result: number;
    chrome: boolean;
    firefox: boolean;
    torBrowser: boolean;
    safari: boolean;
}

export interface PolyfillPow2E3100 {
    result: number[];
    chrome: boolean;
    firefox: boolean;
    torBrowser: boolean;
    safari: boolean;
}

export interface MediaFingerprint {
    mimeTypes: MIMEType[];
}

export interface MIMEType {
    mimeType: string;
    audioPlayType: string;
    videoPlayType: string;
    mediaSource: boolean;
    mediaRecorder: boolean;
}

export interface Resistance {
    privacy: string;
    security: Security;
    mode: string;
    engine: string;
    extensionHashPattern: ExtensionHashPattern;
}

export interface ExtensionHashPattern {
    contentDocument: string;
    contentWindow: string;
    createElement: string;
    getElementById: string;
    append: string;
    insertAdjacentElement: string;
    insertAdjacentHTML: string;
    insertAdjacentText: string;
    prepend: string;
    replaceWith: string;
    appendChild: string;
    insertBefore: string;
    replaceChild: string;
    getContext: string;
    toDataURL: string;
    toBlob: string;
    getImageData: string;
    getByteFrequencyData: string;
    getByteTimeDomainData: string;
    getFloatFrequencyData: string;
    getFloatTimeDomainData: string;
    copyFromChannel: string;
    getChannelData: string;
    hardwareConcurrency: string;
    availHeight: string;
    availLeft: string;
    availTop: string;
    availWidth: string;
    colorDepth: string;
    pixelDepth: string;
}

export interface Security {
    FileSystemWritableFileStream: boolean;
    Serial: boolean;
    ReportingObserver: boolean;
}

export interface ScreenFingerprint {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    touch: boolean;
    lied: number;
}

export interface TimezoneFingerprint {
    zone: string;
    location: string;
    locationMeasured: string;
    locationEpoch: number;
    offset: number;
    offsetComputed: number;
    lied: number;
}

export interface WebRTCData {
    codecsSdp: CodecsSDP;
    extensions: string[];
    foundation: string;
    foundationProp: string;
    iceCandidate: string;
    address: string;
    stunConnection: string;
}

export interface CodecsSDP {
    audio: Audio[];
    video: Audio[];
}

export interface Audio {
    channels?: number;
    mimeType: string;
    clockRates: number[];
    feedbackSupport?: string[];
    sdpFmtpLine?: string[];
}

export interface WindowFeatures {
    keys: string[];
    apple: number;
    moz: number;
    webkit: number;
}

export interface IsBotBotD {
    bot: boolean;
}


export function isBot(): Promise<DetectorResult>

//# sourceMappingURL=index.d.ts.map
