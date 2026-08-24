---
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-react": patch
"@prosopo/types": patch
---

Fix the reload button on the image captcha closing the challenge instead of loading a new one. Reload now asks the frictionless wrapper for a fresh session and re-mounts the widget so a new challenge opens straight away, and the checkbox click position is carried over to the replacement solve
