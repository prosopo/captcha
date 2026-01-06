# Bugs Found During Test Coverage Assessment

## 1. `ruleInput.ts` - groupId prioritization bug

**Location**: `src/ruleInput/ruleInput.ts`, lines 36-66

**Issue**: When both `groupId` and `ruleGroupId` are provided, the transform should prioritize `groupId`, but the test shows it's returning `ruleGroupId` instead.

**Test failure**: `accessRuleInput > should prioritize groupId over ruleGroupId`
- Expected: `'group1'`
- Received: `'group2'`

**Root cause**: The `ruleGroupInput` transform correctly prioritizes `groupId`, but the final transform on line 66 (`transform((ruleInput: AccessRuleInput): AccessRule => ruleInput)`) may be passing through the original input before the transform is applied, or the `.and()` merge is not preserving the transformed value correctly.

## 2. `ruleInput.ts` - getAccessRuleFiltersFromInput order bug

**Location**: `src/ruleInput/ruleInput.ts`, lines 91-116

**Issue**: When both `policyScope` and `policyScopes` are provided, the function should return filters in the order: first the `policyScope`, then the `policyScopes`. However, the test shows the first filter has `client2` instead of `client1`.

**Test failure**: `getAccessRuleFiltersFromInput > should combine policyScope and policyScopes`
- Expected first filter: `client1`
- Received first filter: `client2`

**Root cause**: The order of adding policy scopes appears correct in the code (lines 99-105), but the test is failing. This suggests the order might be reversed somewhere, or there's an issue with how the filters are being constructed.

## 3. `deleteRules.ts` - deduplication/counting bug

**Location**: `src/api/delete/deleteRules.ts`

**Issue**: Two test failures related to rule deletion:
1. `should remove duplicate rule IDs before deleting` - Expected deleted_count: 2, Received: 4
2. `should handle multiple filter inputs` - Expected `deleteRules` to be called 1 time, but got 2 times

**Root cause**: The deduplication logic on line 56 (`const uniqueRuleIds = [...new Set(allRuleIds)];`) should work, but it seems like duplicate IDs are not being removed, or the count is incorrect. Alternatively, `deleteRules` might be called multiple times instead of once with all unique IDs.

## 4. `userScopeInput.ts` - IP mask prioritization bug

**Location**: `src/ruleInput/userScopeInput.ts`, lines 64-103

**Issue**: When both `ipMask` (string) and `numericIpMaskMin/Max` are provided, the code should prioritize the numeric values, but the test shows it's using the converted `ipMask` value instead.

**Test failure**: `userScopeInput > should prioritize numeric IP mask over string IP mask`
- Expected: `100n` (from numericIpMaskMin)
- Received: `2130706432n` (from converted ipMask)

**Root cause**: The logic on lines 86-100 checks for `hasNumericIpMask` first, but there might be an issue with how the values are being set or the condition is not working as expected.

## 5. `userScopeInput.ts` - userAgentHash prioritization bug

**Location**: `src/ruleInput/userScopeInput.ts`, lines 35-51

**Issue**: When both `userAgent` and `userAgentHash` are provided, the code should prioritize `userAgentHash`, but the test shows it's hashing the `userAgent` instead.

**Test failure**: `userScopeInput > should prioritize userAgentHash over userAgent`
- Expected: `'directhash'`
- Received: `'1066b48224bb188ceb955605f4fcff98893be...'` (hashed userAgent)

**Root cause**: The condition on line 46 (`if ("string" === typeof userAgent && !userScope.userAgentHash)`) should prevent hashing when `userAgentHash` is already provided, but it seems the `userAgentHash` from the input is not being preserved correctly.

## 6. `policyInput.ts` - sanitizeAccessPolicy not exported

**Location**: `src/ruleInput/policyInput.ts`, line 41

**Issue**: The function `sanitizeAccessPolicy` is defined but tests are failing because it's not being imported/exported correctly, or the import path is wrong.

**Test failures**: All `sanitizeAccessPolicy` tests fail with `(0 , sanitizeAccessPolicy) is not a function`

**Root cause**: The function is exported from `policyInput.ts`, but the test file `policyInput.unit.test.ts` might not be importing it, or there's an export issue.

## 7. `rulesApiClient.integration.test.ts` - Missing import

**Location**: `src/api/rulesApiClient.integration.test.ts`, line 205

**Issue**: The test uses `randomAsHex(16)` but the function is not imported.

**Root cause**: Missing import statement for `randomAsHex` function. This will cause a runtime error when the test runs.

