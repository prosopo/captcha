---
"@prosopo/widget-skeleton": patch
"@prosopo/config": patch
---

Lay the widget out at its natural width in hosts that size it by measuring it.

Size containment on the widget's container-query element left it with no
intrinsic width, so an inline-block, float, `fit-content` box, table cell,
flex item, auto grid track or absolutely positioned host found nothing to
shrink-wrap and fell back to the widget's 170px minimum — rendering it in its
smallest breakpoint on pages with room for all 302px. A zero-height measuring
row now states both intrinsic widths, so the widget fills its natural width
where there is room and still shrinks into parents narrower than it.

`@prosopo/config` gains a `browser` test type, which keeps vitest browser-mode
suites out of jsdom runs.
