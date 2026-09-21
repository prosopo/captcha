---
"@prosopo/widget-skeleton": minor
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
---

Stop the widget's hover highlights costing a phone user their first tap.

Tapping the checkbox on an iPhone did nothing the first time. The second tap worked. The cause is a rule iOS applies to every page: if the first tap on a control changes what is under the finger, Safari treats it as "show me the hover state" rather than "activate this", and withholds the click. Every control in the widget that lights up on hover was therefore asking to be tapped twice.

Hover feedback is now drawn only where a pointer can actually rest on something. On a desktop nothing changes. On a touch screen the highlight never appears and the first tap activates the control, which is what a visitor expects.

Four places had it, and only one of them was the checkbox:

- the **checkbox** — a state layer around the box
- the **reload button** in the challenge dialog — a fill change
- the dialog's **action buttons**, Cancel, Next and Submit — a state layer
- the **widget container** itself, via a CSS `:hover` rule. This one is easy to miss and matters most: the box that lights up is the one the checkbox sits inside, so it repaints under the finger even when the tap never touches a control with its own hover.

The first three ask `matchMedia("(hover: hover)")` before listening for the pointer at all; the fourth is wrapped in the matching media query. The image tiles never had hover feedback and are unchanged.

None of this came from the recent randomisation work — the React components these replaced carried the same handlers, so it has been there as long as the widget has.

Covered by a test per control asserting no state layer is drawn when the device reports it cannot hover, plus tests for the check itself, including that it assumes a pointer when the environment cannot answer — which is what keeps the existing desktop behaviour, and every existing hover test, intact.
