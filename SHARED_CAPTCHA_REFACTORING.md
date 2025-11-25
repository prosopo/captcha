# Shared Captcha Infrastructure Refactoring Plan

## Executive Summary

**Goal**: Extract shared infrastructure from `powcaptchas` and `usercommitments` collections while maintaining their separate identities and purposes.

**Approach**: Option 2 - Keep collections separate, extract shared types, schemas, and database methods.

**Timeline**: ~1 week

**Risk Level**: 🟡 Medium (no schema changes, but significant refactoring)

---

## Current State Analysis

### Collections Overview

**powcaptchas Collection**
- **Purpose**: Proof-of-Work computational challenges with behavioral biometrics
- **Primary Identifier**: `challenge: PoWChallengeId` (string format: `timestamp___userAccount___dappAccount___nonce`)
- **Unique Fields**: `difficulty`, `mouseEvents`, `touchEvents`, `clickEvents`, `deviceCapability`
- **Document Size**: ~4-7 KB (with behavioral data)
- **Records**: Query needed to determine count

**usercommitments Collection**
- **Purpose**: Image-based visual recognition challenges
- **Primary Identifier**: `id: string` (commitment ID)
- **Unique Fields**: `datasetId`, `providerAccount`
- **Document Size**: ~1-2 KB
- **Records**: Query needed to determine count

### Shared Fields (20+ fields from StoredCaptcha base)

Both collections inherit from `StoredCaptcha` interface and share:

**Core Identity**
- `userAccount: string`
- `dappAccount: string`
- `requestedAtTimestamp: number`

**Security & Verification**
- `result: CaptchaResult` (status + reason)
- `serverChecked: boolean` (replay attack prevention)
- `userSubmitted: boolean`
- `userTimestampSignature?: string`

**Network & Device Context**
- `ipAddress: IPAddress` (composite format)
- `providedIp?: IPAddress` (for server-side verification)
- `headers?: RequestHeaders`
- `ja4?: string` (TLS fingerprint)

**Session & Scoring**
- `sessionId?: string`

**External Storage**
- `storedAtTimestamp?: number` (TTL trigger)

**Metadata**
- `deadlineTimestamp?: number`
- `completedAtTimestamp?: number`
- `salt?: string`

### Database Methods Analysis

**Parallel Method Pairs** (code duplication):

| PoW Method | UserCommitment Method | Functionality |
|------------|----------------------|---------------|
| `markDappUserPoWCommitmentsChecked()` | `markDappUserCommitmentsChecked()` | Replay prevention |
| `markDappUserPoWCommitmentsStored()` | `markDappUserCommitmentsStored()` | External storage flag |
| `getUnstoredDappUserPoWCommitments()` | `getUnstoredDappUserCommitments()` | Batch retrieval |
| `updatePowCaptchaRecordResult()` | `approveDappUserCommitment()` / `disapproveDappUserCommitment()` | Result recording |

**Collection-Specific Methods**:
- PoW: `storePowCaptchaRecord()`, `getPowCaptchaRecordByChallenge()`, `updatePowCaptchaRecord()`
- UserCommitment: `storeUserImageCaptchaSolution()`, `getDappUserCommitmentById()`, `getDappUserCommitmentByAccount()`

---

## Refactoring Objectives

### Phase 1: Shared Types & Schemas
**Goal**: Create explicit shared base types while preserving existing interfaces

**Deliverables**:
1. `CaptchaRecordBase` interface - common fields extracted
2. Type discriminators and guards
3. `CaptchaIdentifier` union type
4. Shared schema base for Mongoose

### Phase 2: Database Method Abstraction
**Goal**: Eliminate code duplication in database layer

**Deliverables**:
1. Generic `_markCommitmentsChecked()` method
2. Generic `_markCommitmentsStored()` method
3. Generic `_getUnstoredCommitments()` method
4. Generic `_updateCaptchaResult()` method
5. Shared IP validation logic

### Phase 3: Index & Performance Optimization
**Goal**: Ensure consistent indexing and query performance

**Deliverables**:
1. Index audit for both collections
2. Consistent TTL configuration
3. Compound indexes for common patterns
4. Query performance benchmarks

---

## File Modification Plan

### 1. Type Definitions

**File**: `captcha/packages/types-database/src/types/provider.ts`

**Changes**:
- Extract `CaptchaRecordBase` interface from `StoredCaptcha`
- Add `CaptchaType` enum: `'pow' | 'image'`
- Create `CaptchaIdentifier` type: `PoWChallengeId | string`
- Add type guards: `isPowChallenge()`, `isImageChallenge()`
- Refactor `PoWCaptchaRecord` to extend `CaptchaRecordBase`
- Refactor `UserCommitment` to extend `CaptchaRecordBase`

**Current Structure**:
```typescript
export interface StoredCaptcha {
  // 20+ shared fields
}

export interface PoWCaptchaRecord extends StoredCaptcha {
  challenge: PoWChallengeId;
  difficulty: number;
  // ...
}

export interface UserCommitment extends StoredCaptcha {
  id: string;
  datasetId: string;
  // ...
}
```

**Target Structure**:
```typescript
export interface CaptchaRecordBase {
  // Extract all shared fields here
  userAccount: string;
  dappAccount: string;
  result: CaptchaResult;
  // ... all 20+ shared fields
}

export enum CaptchaType {
  POW = 'pow',
  IMAGE = 'image'
}

export type CaptchaIdentifier = PoWChallengeId | string;

export interface PoWCaptchaRecord extends CaptchaRecordBase {
  challenge: PoWChallengeId;
  difficulty: number;
  mouseEvents?: Array<Record<string, unknown>>;
  touchEvents?: Array<Record<string, unknown>>;
  clickEvents?: Array<Record<string, unknown>>;
  deviceCapability?: string;
}

export interface UserCommitment extends CaptchaRecordBase {
  id: string;
  datasetId: string;
  providerAccount: string;
}

// Type guards
export function isPowChallenge(id: CaptchaIdentifier): id is PoWChallengeId {
  return id.includes('___');
}

export function isImageChallenge(id: CaptchaIdentifier): boolean {
  return !isPowChallenge(id);
}
```

**Backward Compatibility**:
- Keep `StoredCaptcha` as deprecated alias to `CaptchaRecordBase`
- All existing code continues to work

---

### 2. Mongoose Schemas

**File**: `captcha/packages/types-database/src/types/provider.ts`

**Changes**:
- Create `CaptchaRecordBaseSchema` with all shared fields
- Refactor `PoWCaptchaRecordSchema` to extend base
- Refactor `UserCommitmentSchema` to extend base

**Current**:
```typescript
export const PoWCaptchaRecordSchema = new Schema<PoWCaptchaRecord>({
  challenge: { type: String, required: true, unique: true, index: true },
  userAccount: { type: String, required: true, index: true },
  dappAccount: { type: String, required: true, index: true },
  // ... 20+ shared fields individually defined
  // ... PoW-specific fields
});

export const UserCommitmentSchema = new Schema<UserCommitment>({
  id: { type: String, required: true, unique: true, index: true },
  userAccount: { type: String, required: true, index: true },
  dappAccount: { type: String, required: true, index: true },
  // ... same 20+ shared fields duplicated
  // ... Image-specific fields
});
```

**Target**:
```typescript
// Shared base schema definition (not a Schema instance yet)
export const CaptchaRecordBaseSchemaDefinition = {
  userAccount: { type: String, required: true, index: true },
  dappAccount: { type: String, required: true, index: true },
  result: { type: Object, required: true },
  requestedAtTimestamp: { type: Number, required: true, index: true },
  ipAddress: { type: Object, required: true },
  serverChecked: { type: Boolean, required: true, default: false, index: true },
  userSubmitted: { type: Boolean, required: true, default: false, index: true },
  // ... all 20+ shared fields
};

export const PoWCaptchaRecordSchema = new Schema<PoWCaptchaRecord>({
  ...CaptchaRecordBaseSchemaDefinition,
  challenge: { type: String, required: true, unique: true, index: true },
  difficulty: { type: Number, required: true },
  mouseEvents: { type: [Object], required: false },
  touchEvents: { type: [Object], required: false },
  clickEvents: { type: [Object], required: false },
  deviceCapability: { type: String, required: false },
});

export const UserCommitmentSchema = new Schema<UserCommitment>({
  ...CaptchaRecordBaseSchemaDefinition,
  id: { type: String, required: true, unique: true, index: true },
  datasetId: { type: String, required: true, index: true },
  providerAccount: { type: String, required: true, index: true },
});
```

---

### 3. Database Implementation

**File**: `captcha/packages/database/src/databases/provider.ts`

**Changes**: Add private generic methods for shared operations

**New Methods to Create**:

```typescript
/**
 * Generic method to mark commitments as checked (replay prevention)
 */
private async _markCommitmentsChecked(
  collection: Collection,
  identifiers: string[],
  identifierField: 'challenge' | 'id'
): Promise<void> {
  if (identifiers.length === 0) return;

  await collection.updateMany(
    { [identifierField]: { $in: identifiers } },
    { $set: { serverChecked: true } }
  );
}

/**
 * Generic method to mark commitments as stored externally
 */
private async _markCommitmentsStored(
  collection: Collection,
  identifiers: string[],
  identifierField: 'challenge' | 'id'
): Promise<void> {
  if (identifiers.length === 0) return;

  await collection.updateMany(
    { [identifierField]: { $in: identifiers } },
    { $set: { storedAtTimestamp: Date.now() } }
  );
}

/**
 * Generic method to retrieve unstored commitments for batch processing
 */
private async _getUnstoredCommitments<T>(
  collection: Collection,
  dappAccount: string,
  blockNumber: number
): Promise<T[]> {
  return collection.find({
    dappAccount,
    requestedAtTimestamp: { $lte: blockNumber },
    serverChecked: true,
    storedAtTimestamp: { $exists: false }
  }).toArray() as Promise<T[]>;
}

/**
 * Generic IP validation logic
 */
private async _validateAndUpdateIp(
  collection: Collection,
  identifier: string,
  identifierField: 'challenge' | 'id',
  providedIp: string,
  recordIpAddress: IPAddress,
  ipValidationRules?: any
): Promise<{ isValid: boolean; errorMessage?: string; distanceKm?: number }> {
  // Shared IP validation logic extracted from both verifyPowCaptchaSolution
  // and equivalent image captcha verification
  await collection.updateOne(
    { [identifierField]: identifier },
    { $set: { providedIp: getCompositeIpAddress(providedIp) } }
  );

  return deepValidateIpAddress(
    providedIp,
    recordIpAddress,
    this.logger,
    // API key/base URL from config
    undefined, // Will need to pass from caller
    undefined,
    ipValidationRules
  );
}
```

**Refactor Existing Methods**:

```typescript
// Before (duplicated)
async markDappUserPoWCommitmentsChecked(challenges: PoWChallengeId[]): Promise<void> {
  if (challenges.length === 0) return;
  await this.powCaptchas.updateMany(
    { challenge: { $in: challenges } },
    { $set: { serverChecked: true } }
  );
}

async markDappUserCommitmentsChecked(commitmentIds: string[]): Promise<void> {
  if (commitmentIds.length === 0) return;
  await this.usercommitments.updateMany(
    { id: { $in: commitmentIds } },
    { $set: { serverChecked: true } }
  );
}

// After (using shared method)
async markDappUserPoWCommitmentsChecked(challenges: PoWChallengeId[]): Promise<void> {
  return this._markCommitmentsChecked(this.powCaptchas, challenges, 'challenge');
}

async markDappUserCommitmentsChecked(commitmentIds: string[]): Promise<void> {
  return this._markCommitmentsChecked(this.usercommitments, commitmentIds, 'id');
}
```

---

### 4. Interface Updates

**File**: `captcha/packages/types-database/src/types/provider.ts`

**Changes**: Update `IProviderDatabase` interface documentation

**Current**:
```typescript
export interface IProviderDatabase {
  // 40+ method signatures
}
```

**Target**:
```typescript
export interface IProviderDatabase {
  // Group methods by functionality with comments

  // ========================================
  // PoW Captcha Methods
  // ========================================
  storePowCaptchaRecord(...): Promise<void>;
  getPowCaptchaRecordByChallenge(...): Promise<PoWCaptchaRecord | undefined>;
  updatePowCaptchaRecord(...): Promise<void>;
  updatePowCaptchaRecordResult(...): Promise<void>;

  // ========================================
  // Image Captcha Methods
  // ========================================
  storeUserImageCaptchaSolution(...): Promise<void>;
  getDappUserCommitmentById(...): Promise<UserCommitment | undefined>;
  approveDappUserCommitment(...): Promise<void>;
  disapproveDappUserCommitment(...): Promise<void>;

  // ========================================
  // Shared Security Methods (both types)
  // ========================================
  markDappUserPoWCommitmentsChecked(challenges: PoWChallengeId[]): Promise<void>;
  markDappUserCommitmentsChecked(commitmentIds: string[]): Promise<void>;

  // ========================================
  // Shared Storage Methods (both types)
  // ========================================
  markDappUserPoWCommitmentsStored(challenges: PoWChallengeId[]): Promise<void>;
  markDappUserCommitmentsStored(commitmentIds: string[]): Promise<void>;
  getUnstoredDappUserPoWCommitments(dappAccount: string, blockNumber: number): Promise<PoWCaptchaRecord[]>;
  getUnstoredDappUserCommitments(dappAccount: string, blockNumber: number): Promise<UserCommitment[]>;

  // ... other methods
}
```

---

## Implementation Steps

### Step 1: Type Extraction (Day 1)
- [ ] Create `CaptchaRecordBase` interface
- [ ] Define `CaptchaType` enum
- [ ] Create `CaptchaIdentifier` type
- [ ] Implement type guard functions
- [ ] Add deprecation notice to `StoredCaptcha`
- [ ] Run TypeScript compilation check
- [ ] Verify no breaking changes

### Step 2: Schema Refactoring (Day 2)
- [ ] Extract `CaptchaRecordBaseSchemaDefinition`
- [ ] List all 20+ shared fields explicitly
- [ ] Refactor `PoWCaptchaRecordSchema` to use spread
- [ ] Refactor `UserCommitmentSchema` to use spread
- [ ] Run tests to ensure schemas still work
- [ ] Verify MongoDB queries unchanged

### Step 3: Database Method Abstraction (Days 3-4)
- [ ] Implement `_markCommitmentsChecked()`
- [ ] Implement `_markCommitmentsStored()`
- [ ] Implement `_getUnstoredCommitments()`
- [ ] Refactor PoW methods to use generic implementations
- [ ] Refactor Image methods to use generic implementations
- [ ] Add unit tests for generic methods
- [ ] Integration tests for refactored methods

### Step 4: Documentation & Interface Organization (Day 5)
- [ ] Add JSDoc comments to shared methods
- [ ] Reorganize `IProviderDatabase` interface with section comments
- [ ] Update any affected README files
- [ ] Document backward compatibility guarantees

### Step 5: Index Audit & Optimization (Days 6-7)
- [ ] Query current indexes on both collections
- [ ] Document query patterns from application code
- [ ] Identify missing compound indexes
- [ ] Ensure consistent TTL configuration
- [ ] Run performance benchmarks before/after
- [ ] Document index strategy

---

## Testing Requirements

### Unit Tests
- [ ] Type guard functions (`isPowChallenge()`, `isImageChallenge()`)
- [ ] Generic database methods with mock collections
- [ ] Schema validation (ensure all fields present)

### Integration Tests
- [ ] PoW captcha flow end-to-end (unchanged behavior)
- [ ] Image captcha flow end-to-end (unchanged behavior)
- [ ] Replay prevention for both types
- [ ] External storage batching for both types
- [ ] IP validation for both types

### Performance Tests
- [ ] Query performance: `findOne()` by identifier
- [ ] Batch update performance: `markCommitmentsChecked()`
- [ ] TTL index performance
- [ ] Memory usage (schema size)

---

## Rollback Plan

### If Issues Discovered

**Phase 1 Issues (Types)**:
- Revert type changes
- Restore `StoredCaptcha` as primary interface
- No database impact

**Phase 2 Issues (Database Methods)**:
- Revert generic method implementations
- Restore original method bodies
- No schema changes needed

**Phase 3 Issues (Indexes)**:
- Drop newly created indexes
- Restore original index configuration
- Query patterns unchanged

### Rollback Procedure
1. Identify failing tests/functionality
2. `git revert` specific commit range
3. Run full test suite
4. Deploy hotfix if in production
5. Post-mortem to understand failure

---

## Success Metrics

### Code Quality
- [ ] Reduce database method duplication by 40-50%
- [ ] Type safety improvements (no `any` types)
- [ ] Consistent schema definitions (DRY principle)

### Functionality
- [ ] Zero breaking changes to existing APIs
- [ ] All existing tests pass
- [ ] No regression in query performance

### Documentation
- [ ] Clear separation of shared vs unique functionality
- [ ] Type guards documented with examples
- [ ] Database method purpose clearly stated

---

## Risk Assessment

### Low Risk ✅
- Type extraction (compile-time only)
- Schema refactoring (runtime behavior identical)
- Documentation improvements

### Medium Risk ⚠️
- Database method refactoring (logic changes)
- Generic implementations (need thorough testing)
- Index modifications (query performance impact)

### High Risk 🔴
- None - we are NOT changing schemas or identifiers
- None - we are NOT merging collections
- None - we are NOT modifying data

---

## Open Questions

1. **Should we add a virtual discriminator field?**
   - Pro: Makes it easy to identify record type programmatically
   - Con: Not needed since collections are separate
   - Decision: NO - keep collections fully independent

2. **Should we create a shared base Mongoose model?**
   - Pro: Could enable polymorphic queries if collections merged later
   - Con: Adds complexity for no current benefit
   - Decision: NO - use schema definition spread only

3. **Should we add behavioral data fields to UserCommitment?**
   - Pro: Could enable bot detection for image captchas
   - Con: May not make sense for different interaction model
   - Decision: DEFER - out of scope for this refactoring

4. **Should we consolidate the TTL configuration?**
   - Current: Separate TTL indexes on each collection
   - Pro: Single source of truth for retention policy
   - Con: May want different retention for different types
   - Decision: AUDIT first, then decide

---

## Related Documentation

- Main migration plan: `/home/hugh/prosopo/captcha-private/captcha/SHARED_CAPTCHA_REFACTORING.md` (this file)
- Database interface: `captcha/packages/types-database/src/types/provider.ts`
- Database implementation: `captcha/packages/database/src/databases/provider.ts`
- PoW captcha tasks: `captcha/packages/provider/src/tasks/powCaptcha/powTasks.ts`

---

## Timeline Summary

| Phase | Duration | Risk |
|-------|----------|------|
| Type extraction | 1 day | Low ✅ |
| Schema refactoring | 1 day | Low ✅ |
| Database methods | 2 days | Medium ⚠️ |
| Documentation | 1 day | Low ✅ |
| Index optimization | 2 days | Medium ⚠️ |
| **Total** | **7 days** | **Medium ⚠️** |

---

## Approval Checklist

Before starting implementation:
- [ ] Reviewed this plan with team
- [ ] Confirmed backward compatibility requirements
- [ ] Agreed on testing strategy
- [ ] Scheduled deployment window
- [ ] Prepared rollback procedure
- [ ] Notified stakeholders of timeline

---

**Last Updated**: 2025-11-24
**Author**: Claude Code
**Status**: 📋 Planning - Ready for Review
