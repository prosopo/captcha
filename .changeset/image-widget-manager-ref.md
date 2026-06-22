---
"@prosopo/procaptcha-react": patch
---

fix(procaptcha-react): hold image-captcha Manager in a useRef

Image widget rebuilt the Manager on every render, so the closure
variables that hold the checkbox click coords (set on start) were
overwritten by `(0, 0)` on the next render — including the re-render
that fires immediately after `setLoading(true)` in the click handler.
By the time `submit()` ran, it was on a newer Manager instance that
had never seen the click, so every captcha persisted
`coords[0] = [[0, 0]]`. Matches the pattern PoW and Puzzle already use.
