// src/server/index.d.ts — Server TypeScript declarations for @datex2/dx-type

export const VERSION: string;

export interface TokenizeOptions {
    duration?: number;
    t?: number;
    time?: number;
    delay?: number;
    d?: number;
    offset?: number;
    b?: number;
}

export interface TokenizeResult {
    html: string;
    cleanText: string;
    totalUnits: number;
    speed: number;
    duration: number;
    delay: number;
    offset: number;
    style: string;
}

export interface SsrDxTypeOptions extends TokenizeOptions {
    tagName?: string;
    isSda?: boolean;
    ariaLabel?: string;
    className?: string;
}

export interface SsrDxRevealOptions {
    duration?: number;
    t?: number;
    time?: number;
    delay?: number;
    d?: number;
    tagName?: string;
    isSda?: boolean;
    className?: string;
}

export function formatNumber(val: number | string, type?: string, comma?: string, prefix?: string, suffix?: string): string;
export function generateRibbonHtml(numericValue: number | string, type?: string, comma?: string, prefix?: string, suffix?: string): string;
export function ssrDxNumber(numericValue: number | string, formattedText?: string, cls?: string, type?: string): string;
export function ssrDxOdometer(numericValue: number | string, options?: object): string;
export function tokenize(html: string, options?: TokenizeOptions): TokenizeResult;
export function ssrDxType(content: string, options?: SsrDxTypeOptions): string;
export function ssrDxReveal(content: string, options?: SsrDxRevealOptions): string;
