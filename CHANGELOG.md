## Unreleased

### ⚠️ Breaking Changes

- **RENAMED**: `UserCommitment` → `ImageCaptcha` throughout the codebase
  - Type: `UserCommitmentRecord` → `ImageCaptchaRecord`
  - Schema: `UserCommitmentRecordSchema` → `ImageCaptchaRecordSchema`
  - Database methods:
    - `getDappUserCommitmentById()` → `getImageCaptchaById()`
    - `getDappUserCommitmentByAccount()` → `getImageCaptchaByAccount()`
    - `approveDappUserCommitment()` → `approveImageCaptcha()`
    - `disapproveDappUserCommitment()` → `disapproveImageCaptcha()`
    - `markDappUserCommitmentsChecked()` → `markImageCaptchasChecked()`
    - `getUnstoredDappUserCommitments()` → `getUnstoredImageCaptchas()`
    - `markDappUserCommitmentsStored()` → `markImageCaptchasStored()`
    - `updateDappUserCommitment()` → `updateImageCaptcha()`
    - `storeUserImageCaptchaSolution()` → `storeImageCaptchaSolution()`
    - `flagProcessedDappUserCommitments()` → `flagProcessedImageCaptchas()`
    - `getCheckedDappUserCommitments()` → `getCheckedImageCaptchas()`
  - Collection name: `commitment` → `imagecaptcha` in database

### 🚀 Features

- **Pending Collection Merge**: Merged `pending` collection into `imagecaptcha` collection
  - Added `pending` boolean field to `ImageCaptchaRecord` (default: false)
  - Added pending-related fields: `requestHash`, `salt`, `deadlineTimestamp`, `threshold`
  - Pending requests now stored as `imagecaptcha` records with `pending=true`
  - Solution submission updates same record to `pending=false`
  - Benefits: Simpler data model, atomic state transitions, better query performance

### 📚 Documentation

- Updated type definitions to reflect ImageCaptcha terminology
- Database schema changes documented in type definitions

### ❤️ Thank You

- GitHub Copilot

## 2.5.6 (2025-06-02)

### 🩹 Fixes

- nx workspace for captcha ([#1873](https://github.com/prosopo/captcha/pull/1873))

### ❤️ Thank You

- George Oastler @goastler