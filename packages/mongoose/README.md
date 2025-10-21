# @prosopo/mongoose

Mongoose utilities and middleware for Prosopo packages.

This package provides:
- Mongoose connection management utilities
- Standard middleware for timestamp management (createdAt, updatedAt)
- Version increment middleware for mutation operations
- Schema and model builders with automatic middleware application
- Zod-to-Mongoose schema mapping with validation
- Model caching to support multiple `.model()` calls

## Features

### Automatic Middleware
All schemas created with this package automatically include:
- Version increment (`__v`) on all mutating operations
- `createdAt` timestamp (set once on creation, never overwritten)
- `updatedAt` timestamp (updated on every mutation)

### Zod Integration
Convert Zod schemas to Mongoose schemas with automatic validation in pre and post middleware.
