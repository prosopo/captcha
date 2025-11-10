# Procaptcha-Common Unit Tests

This directory contains unit tests for the business logic in the `procaptcha-common` package.

## Configuration

The tests use `vite.test.config.ts` which follows the project pattern:
- Extends `ViteTestConfig` from `@prosopo/config`
- Adds `jsdom` environment for DOM testing
- Enables globals for vitest

## Test Files

### `providers.test.ts`
Tests for provider selection and retry logic:
- `getProcaptchaRandomActiveProvider`: Verifies random provider selection using crypto API
- `providerRetry`: Tests retry mechanism with error handling and max attempt limits

### `state-builder.test.ts`
Tests for state management:
- `buildUpdateState`: Validates state mutation and update callbacks
- `useProcaptcha`: Tests React-like state hook builder functionality

### `form.test.ts`
Tests for DOM form manipulation utilities:
- `getParentForm`: Tests finding parent forms including Shadow DOM support
- `removeProcaptchaResponse`: Validates removal of captcha response elements from DOM

### `window.test.ts`
Tests for window callback utilities:
- `getWindowCallback`: Tests retrieval of callback functions from window object

### `defaultCallbacks.test.ts`
Tests for callback management:
- `getDefaultCallbacks`: Tests default callback creation and behavior
- `setUserCallbacks`: Validates merging of user callbacks with defaults
- Various lifecycle callbacks: onHuman, onError, onExpired, onFailed, etc.

### `defaultEvents.test.ts`
Tests for event merging:
- `getDefaultEvents`: Tests merging of default and custom callbacks

### `extensionLoader.test.ts`
Tests for dynamic extension loading:
- `ExtensionLoader`: Validates conditional loading of Web2 vs Web3 extensions

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The tests cover:
- State management and mutations
- Provider selection and retry logic
- DOM manipulation and form handling
- Callback lifecycle management
- Error handling scenarios
- Shadow DOM support
- Window object interactions

