// src/server/index.d.ts — Server TypeScript declarations for @datex2/dx-type

export const VERSION: string;

/**
 * Tokenize text into `<t><w><c style="--I:index">char</c></w></t>` structure for SSR typewriter rendering.
 * @param text Raw text content
 * @returns HTML string with `<t><w><c>...</c></w></t>` structure
 */
export function tokenize(text: string): string;
