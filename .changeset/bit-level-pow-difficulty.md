---
"@prosopo/util": minor
"@prosopo/provider": minor
"@prosopo/types": minor
---

Bit-level granular PoW difficulty via target-threshold check. `solvePoW` (client) and `validateSolution` (server) now compare the hash as a 256-bit big-endian integer against `target = 2^(256 - round(4 * difficulty))`, shared via `targetForDifficulty` / `hashMeetsDifficulty` in `@prosopo/util`. Integer difficulties produce *identical* behaviour to the legacy hex-prefix check (d=4 ≡ 16 leading zero bits ≡ threshold 2^240), so existing clients, configs, anomaly detectors, and stored records are unchanged. Fractional values quantise to bit-level granularity: each 0.25 step ≡ 1 bit ≡ 2× work, so providers can tune d=4.25, d=4.5, d=4.75 to fill the 16× gap between today's d=4 and d=5 — useful for landing on a sensible mobile UX. `powDifficulty` in `ClientSettingsSchema` and `RoutingMachineOutputSchema` drops `.int()`; wire format (nonce as `u32`, difficulty as `number`) is unchanged.
