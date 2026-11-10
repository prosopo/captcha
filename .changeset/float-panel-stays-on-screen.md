---
"@prosopo/procaptcha-common": patch
---

In float placement, the challenge panel no longer opens with its top cut off. It still opens above the widget when there is room. When there is not, because the widget is near the top of the screen, it now opens below the widget. If it fits on neither side, it starts at the top of the screen. Before, it always opened above, so a widget near the top of a fixed dialog or a page that cannot scroll hid the panel's instructions with no way to reach them.
