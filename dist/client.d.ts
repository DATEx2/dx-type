// src/client/index.d.ts — Client TypeScript declarations & HTMLElementTagNameMap for @datex2/dx-type

export interface FormatConfig {
    type: string;
    comma: string;
    prefix: string;
    suffix: string;
}

export interface NumParts {
    pfx: string;
    digits: string;
    radix: string;
    decimals: string;
    sfx: string;
    pfxSpace: string;
    sfxSpace: string;
}

export const rootWin: (Window & typeof globalThis) | null;

export class DxBase extends HTMLElement {
    unpackTemplate(): boolean;
}

export function el(tag: string, cls?: string, content?: string | number, extra?: string): string;
export function span(cls?: string, content?: string | number, extra?: string): string;
export function defCustomElement(tag: string, cls: CustomElementConstructor): void;

export const DX_ANIM: {
    readonly TYPED: 'dx-typed';
    readonly TYPING: 'dx-typing';
    readonly REVEALED: 'dx-revealed';
    readonly REVEALING: 'dx-revealing';
    readonly TYPE_GUARD: 'TYPE-';
    readonly REVEAL_GUARD: 'REVEAL-';
    readonly KF_TYPE_SDA: 'type-sda';
    readonly KF_REVEAL_SDA: 'reveal-sda';
    readonly KF_REVEAL_IN: 'reveal-in';
    readonly KF_REVEAL_FADE: 'reveal-fade-in';
    readonly KF_TYPE_IN: 'type-in';
    readonly KF_SDA_SENSOR: 'sda-sensor';
    readonly KF_PLAY_TOGGLE: 'play-toggle';
    readonly KF_ODO_ROLL: 'odo-roll';
    readonly KF_RUN_ODOMETER: 'run-odometer';
    readonly REVEAL_DURATION: 360;
    readonly TYPE_DURATION: 40;
};

export function getIO(): IntersectionObserver | null;
export function observeIO(el: Element | null, callback: (el: Element) => void): void;
export function unobserveIO(el: Element | null): void;
export function registerRAF(el: { _stepAnimation(now: number): void }): void;
export function unregisterRAF(el: { _stepAnimation(now: number): void }): void;

export function unpackTemplate(el: Element | null): boolean;
export function observeTypewriter(el: Element | null): void;
export function mountTypewriter(el: Element | null, e?: AnimationEvent): void;
export function ensureElementsUpToTarget(target: Element | null): void;
export function cleanupTypedDOM(typeEl: Element | null): void;
export function onTypewriterEnd(cEl: Element | null, event?: AnimationEvent): boolean;
export function bootstrapTypewriterObserver(root?: Document | Element | null): void;

export class DxTyping extends DxBase {
    readonly isTyped: boolean;
    markTyped(): void;
}

export function finishReveal(el: Element | null, e?: AnimationEvent): void;
export function startReveal(el: Element | null, e?: AnimationEvent): void;

export class DxRevealing extends DxBase {
    readonly isRevealed: boolean;
    markRevealed(): void;
}

export class uiNum {
    static format(value: number | string, type?: string, comma?: string, prefix?: string, suffix?: string): string;
}

export function parseNumParts(str: string): NumParts;

export class DxMeter extends DxBase {
    readonly isStatic: boolean;
    getNumericValue(): number;
    getFormatConfig(): FormatConfig;
    formatValue(val: number | string): string;
    setAccessibility(val?: number | string): void;
    makeStatic(): void;
}

export class DxType extends DxTyping {}
export class DxTypeSda extends DxTyping {}
export class DxReveal extends DxRevealing {}
export class DxRevealSda extends DxRevealing {}
export class DxTypeReady extends DxBase {}

export class DxNumber extends DxMeter {
    init(): void;
    val(newValue?: number | string, duration?: number): number | this;
    animateTo(targetValue: number, duration: number): void;
    render(): void;
}

export class DxOdometer extends DxMeter {
    init(): void;
    getStaticHTML(): string;
    val(newValue?: number | string): number | this;
    update(): void;
}

declare global {
    interface HTMLElementTagNameMap {
        'dx-type': DxType;
        'dx-type-sda': DxTypeSda;
        'dx-reveal': DxReveal;
        'dx-reveal-sda': DxRevealSda;
        'dx-type-ready': DxTypeReady;
        'dx-number': DxNumber;
        'dx-odometer': DxOdometer;
    }
}
