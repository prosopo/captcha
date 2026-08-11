---
"@prosopo/prosoponator-bot": patch
---

Add unit and type tests for the prosoponator bot, and fix the defects they found:

- The bot ran any command for anyone who could comment on a pull request. It now only acts on comments from an OWNER, MEMBER or COLLABORATOR, and reacts with "confused" otherwise.
- No octokit call was awaited, so the process could exit before a review landed, a failed request became an unhandled rejection instead of a failed run, and the thumbs up appeared whether or not the review was accepted.
- A missing comment id or issue number fell back to `-1`, turning a malformed payload into a swallowed 404. Both now fail the run.
- A comment body was assumed to be a string, so a bodyless comment payload threw inside `split`.
- Command lookup was a plain property access, so `@prosoponator constructor` dispatched a function inherited from `Object.prototype`.
- An unset token was passed to `getOctokit` as an empty string, producing an unauthenticated client that failed with a 401 after it had already reacted. The run now fails up front.
- Importing the package ran the action; it now only runs when it is the process entrypoint.
