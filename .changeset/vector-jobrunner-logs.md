---
"@prosopo/vector-docker": patch
---

Add job-runner and job-orchestrator log pipelines to the vector config.
Previously the runner/orchestrator containers set `vector.runner=true` /
`vector.orchestrator=true` labels but no source consumed them, so every
job-runner log was dropped. New streams: `${NODE_ENV}_jobrunner_node`
and `${NODE_ENV}_orchestrator_node` on both `oo.prosopo.io` and
`oo2.prosopo.io`.
