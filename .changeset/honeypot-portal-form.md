---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-bundle": patch
---

feat(widget): bait AI responses with empty input + decoded label, portaled into the dapp's form

Redesigns the honeypot so it can actually catch AI agents instead of being inert:

- Empty input + decoded label: the encoded morse/semaphore question moves from `input.value` to an offscreen `<label>` (base64-decoded at render). Naive form-fillers and humans leave the empty input alone; agents that read the DOM as a prompt write into the empty field, captured as `clientMetaData.hp` on submit.
- Portaled to light DOM, inside the dapp's `<form>`: widget stays in shadow DOM, but the honeypot portals via `react-dom/createPortal` into the enclosing form (`document.body` fallback). Bots no longer have to traverse `.shadowRoot` to reach it (which was tripping `@prosopo/catcher`'s shadow-DOM guard and wiping the bot's value), and the bait sits where bots actually look — `form.querySelectorAll('input')`.
- `form="<useId>-d"`: opaque per-instance non-existent form id disassociates the input from native form submission while keeping it DOM-discoverable. Dapp backends don't receive a stray `email_confirm=` field.
- Shared `<Honeypot />` extracted to `@prosopo/procaptcha-common`.
- `procaptcha-bundle` Vite config now routes the Honeypot module into a per-build opaque chunk (`c<random8hex>-<hash>.js`) so the URL doesn't identify the component or stay stable across builds for static blocklisting.
