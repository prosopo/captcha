---
"@prosopo/procaptcha-puzzle": patch
---

Closing the puzzle while an answer is still being checked now keeps it closed. Before, a wrong answer that came back after the user dismissed the puzzle reopened it and fetched a new one. Also, if the user clicked the checkbox again before an old retry finished, the stale puzzle could replace the new one, so their answer was checked against the wrong challenge.
