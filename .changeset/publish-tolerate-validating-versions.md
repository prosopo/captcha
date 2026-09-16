---
---

fix(ci): don't strand a release because npm is still reviewing a version

A version npm is running its automated review over is "staged": uploaded, not yet servable, and impossible to publish over — every retry returns `409 Cannot publish over previously staged version`. That is a queue to wait out, not a failure to act on.

Failing the publish step on it stranded the whole release. `Publish to npm` sits before the docker image push, the GitHub release and the private release PR, so v3.8.12 produced no deployable image and no downstream PR while the packages themselves were simply pending review — and each retry staged one more package, which is how `web-bot-auth@0.1.1` went from published to stuck.

A staged-version conflict now warns and continues; the versions go live when npm's review finishes. Every other publish error still fails the job.
