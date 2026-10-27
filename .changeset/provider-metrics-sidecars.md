---
---

Run cadvisor and redis-exporter beside every provider so vector can scrape per-container and whole-machine cpu, memory, disk and network, and redis stats. Both are capped (cadvisor 256M / 0.5 CPU, redis-exporter 64M / 0.25 CPU). The example env files gain REDIS_PASSWORD, which redis-exporter reads.
