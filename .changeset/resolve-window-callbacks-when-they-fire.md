---
"@prosopo/procaptcha-common": patch
---

Stop the widget failing to render when it loads before the page's callbacks are defined.

A site names its callbacks by string, either as `data-callback="onCaptchaVerified"` or in the render options. The widget looked those names up on `window` the moment it mounted, and threw if one was not there yet — which took the whole widget down, so the visitor got no captcha at all.

Whether that happened was a race. The documented way to embed the widget is `<script ... async defer>`, and `async` means the bundle runs as soon as it has arrived, which can be before the rest of the page has executed. A page that defines its callback in a module script — as every one of our own demo pages does — is therefore relying on the network to lose that race. It usually does. When it does not, the widget dies, and nothing about the error points at load order.

The name is now looked up when the callback actually fires. By then the page has long since finished loading, so the race is gone. A name that is never defined anywhere still throws the same error, just at the point where it would have been called: the site's own handler breaks instead of the captcha.

This is also what was making the end-to-end suite fail intermittently — the failing spec moved around between runs, because which one lost the race depended on how the bundle happened to be chunked.
