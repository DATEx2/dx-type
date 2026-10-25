// tests/test-event-storm-containment.js — Verify animation bubbling storm elimination on <dx-t>
import { JSDOM } from 'jsdom';
import { unpackTemplate } from '../src/client/base/dx-typing.js';

function assert(condition, msg) {
    if (!condition) throw new Error(`ASSERT FAILED: ${msg}`);
}

export default function testEventStormContainment() {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <dx-reveal-sda id="rev">
            <dx-type-sda id="tw">
                <dx-s>Hello</dx-s>
                <template>
                    <dx-t aria-hidden="true">
                        <dx-w>
                            <dx-c class="char-1">H</dx-c>
                            <dx-c class="last-char" data-last="true">!</dx-c>
                        </dx-w>
                    </dx-t>
                </template>
            </dx-type-sda>
        </dx-reveal-sda>
    `);

    const document = dom.window.document;
    const rev = document.getElementById('rev');
    const tw = document.getElementById('tw');

    let revEndEvents = 0;
    let revStartEvents = 0;
    rev.addEventListener('animationend', () => revEndEvents++);
    rev.addEventListener('animationstart', () => revStartEvents++);

    // 1. Unpack template into live DOM
    const success = unpackTemplate(tw);
    assert(success === true, 'unpackTemplate must succeed');

    const tt = tw.querySelector('dx-t');
    assert(tt !== null, '<dx-t> must be mounted into DOM');
    assert(tt._stopAnimStorm === true, '<dx-t> must have _stopAnimStorm flag');

    // 2. Dispatch animationend on intermediate character
    const c1 = tt.querySelector('.char-1');
    assert(c1 !== null, 'char-1 must exist');

    const endEvt = new dom.window.Event('animationend', { bubbles: true, cancelable: true });
    c1.dispatchEvent(endEvt);

    const startEvt = new dom.window.Event('animationstart', { bubbles: true, cancelable: true });
    c1.dispatchEvent(startEvt);

    assert(revEndEvents === 0, 'Ancestor <dx-reveal-sda> must NOT receive intermediate character animationend');
    assert(revStartEvents === 0, 'Ancestor <dx-reveal-sda> must NOT receive intermediate character animationstart');
}
