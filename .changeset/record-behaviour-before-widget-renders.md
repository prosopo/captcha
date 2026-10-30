---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
---

Record what the visitor does on the page from the moment the procaptcha script loads, and add it to the behavioural data sent with each solve.

The detector's trackers only start once a widget renders. On sites that render it late, everything before that was missing. A checkout that mounts the widget when Buy is pressed, for example, loses the visitor's scroll down the page and the tap on Buy. A quick tap on the checkbox before detection finished was lost too. Those visitors were then judged on one or two stray events, or none at all, and sent to an image or puzzle challenge. The script now records mouse, touch, press and scroll events until detection finishes, then puts them in front of the detector's own data, dropping any event both recorded.
