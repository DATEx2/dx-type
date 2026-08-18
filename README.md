# @datex2/dx-type

DATEx2 Web Components for scroll-driven typewriter, reveal, counter and odometer animations.

## Components

| Tag | Description | Domain |
|-----|------------|--------|
| `<dx-type>` | Typewriter animation (hero/document timeline) | Hero |
| `<dx-type-sda>` | Typewriter animation (scroll-driven) | SDA |
| `<dx-reveal>` | Fade-in reveal (hero/document timeline) | Hero |
| `<dx-reveal-sda>` | Fade-in reveal (scroll-driven) | SDA |
| `<dx-type-ready>` | Container that gates `.type-ready` for hero children | Hero |
| `<dx-number>` | Animated numeric counter (rAF batched) | Both |
| `<dx-odometer>` | Mechanical drum odometer (read-only, one-time) | Both |

## Architecture

```
HTMLElement
├── DxBase (display: contents, unpackTemplate)
│   ├── DxTyping (markTyped, cleanupTypedDOM, IO singleton)
│   │   ├── DxType → <dx-type>
│   │   └── DxTypeSda → <dx-type-sda>
│   ├── DxRevealing (markRevealed, startReveal, finishReveal)
│   │   ├── DxReveal → <dx-reveal>
│   │   └── DxRevealSda → <dx-reveal-sda>
│   └── DxMeter (formatValue, setAccessibility, makeStatic)
│       ├── DxNumber → <dx-number>
│       └── DxOdometer → <dx-odometer>
```

## Design Principles

- **Zero inline handlers** — all `animationstart`/`animationend` listeners attached in `connectedCallback`
- **Zero polluting classes** — CSS targets `dx-*` element tags directly, not `.type-sda` / `.reveal-sda`
- **`display: contents`** — wrapper elements never disrupt parent Grid/Flexbox layouts
- **Singleton IO** — one `IntersectionObserver` for all JIT template unpacking
- **Singleton rAF** — one `requestAnimationFrame` loop batching all `<dx-number>` animations
- **Pure ES2026** — zero external dependencies

## Usage

```js
// Import all components (each self-registers its custom element)
import '@datex2/dx-type';

// Or import specific components
import { DxTypeSda, DxRevealSda } from '@datex2/dx-type/client';

// SSR tokenizer
import { tokenize } from '@datex2/dx-type/server';
```

```html
<!-- Scroll-driven typewriter -->
<dx-type-sda>
  <template><t><w><c style="--I:0">H</c><c style="--I:1">i</c></w></t></template>
  <s-t>Hi</s-t>
</dx-type-sda>

<!-- Scroll-driven reveal -->
<dx-reveal-sda style="--d: 150ms;">
  <p>This fades in on scroll</p>
</dx-reveal-sda>

<!-- Animated counter -->
<dx-number type="int" percent="1299" suffix=" €" comma=","></dx-number>

<!-- Mechanical odometer (read-only, one-time) -->
<dx-odometer type="year" percent="2026" start="2020"></dx-odometer>
```

## CSS

Import the base CSS:

```css
@import '@datex2/dx-type/css';
```

Product-specific keyframes (`@keyframes type-sda`, `@keyframes reveal-sda`) remain in the consuming project.

## Testing

```bash
npm test
```

## License

MIT © DATEx2
