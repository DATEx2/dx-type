// dx-reveal.js — DATEx2 <dx-reveal> Web Component (Unified with <dx-reveal-sda>).
//
// exports: DxReveal
// used_by: src/client/index.js

import { DxRevealSda } from './dx-reveal-sda.js';
import { defCustomElement } from '../base/dx-base.js';

export class DxReveal extends DxRevealSda {}

defCustomElement('dx-reveal', DxReveal);
defCustomElement('ui-reveal', DxReveal);
