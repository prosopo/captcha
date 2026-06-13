---
"@prosopo/user-access-policy": patch
---

Add explicit `ZodType<T, ZodTypeDef, unknown>` annotations to `accessRuleInput`, `ruleEntryInput`, and `fetchRulesResponse`. The `z.preprocess` on `deferToVerify` widens the input position to `unknown`; without an explicit annotation TS emits an unnameable inferred type and parent repos that import these schemas fail typecheck with TS2742.
