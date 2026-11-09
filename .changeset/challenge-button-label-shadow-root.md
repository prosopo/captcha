---
"@prosopo/procaptcha-react": patch
---

The image challenge's Cancel, Next and Submit buttons now draw their visible label from a closed shadow root inside the button instead of a plain text node, in line with the rest of the challenge not exposing fixed selectors. The buttons look exactly the same in light and dark themes and in every language, and their accessible name still comes from `aria-label`, so screen readers announce them as before. Tests that found these buttons by their visible text should use the button role with its name, or the `aria-label`, instead.
