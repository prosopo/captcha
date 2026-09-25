---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
---

Add tests proving that destroying the widget leaves the host page as it found it: no leftover nodes, document or window listeners, resize observers, timers or styles, and focus handed back to whatever held it. They cover every challenge surface layout, the checkbox, the puzzle canvas mid-drag and mid-animation, and a frictionless widget that no longer reacts to procaptcha:start or procaptcha:execute once destroyed.
