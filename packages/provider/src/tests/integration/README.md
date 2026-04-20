# Provider Integration Tests

## Overview

These integration tests verify the provider's functionality by starting containerized services (MongoDB, Redis) and testing API endpoints.

## Running Tests

### Standard Mode (with Redis)

```bash
npm run test:integration
```

### CI/CD Mode (without Redis)

In CI/CD environments where Docker containers may fail or be unstable, you can skip Redis:

```bash
SKIP_REDIS=true npm run test:integration
```

## Environment Variables

- `SKIP_REDIS`: When set to `true`, Redis containers will not be started, and Redis-dependent features will be skipped. This is useful for CI/CD environments where Redis containers may be unreliable.

## Test Files

- `powCaptcha.integration.test.ts` - Tests PoW (Proof of Work) captcha functionality
- `imgCaptcha.integration.test.ts` - Tests image captcha functionality  
- `decisionMachines.integration.test.ts` - Tests decision machine integration
- `ipValidation.integration.test.ts` - Tests IP validation and frictionless flows

## Notes

- Redis is used for access control rules storage but is not strictly required for basic captcha functionality
- When Redis is unavailable, access control features will be disabled but core captcha operations will continue to work
- MongoDB is always required and cannot be skipped

