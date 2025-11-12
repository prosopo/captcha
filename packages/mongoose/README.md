# @prosopo/mongoose

Mongoose utilities and middleware for Prosopo packages.

This package provides:
- Mongoose connection management utilities
- Standard middleware plugin for timestamp management (createdAt, updatedAt)
- Version increment middleware for mutation operations
- Schema and model builders with automatic middleware application via plugin
- Zod-to-Mongoose schema mapping with validation
- Model caching to support multiple `.model()` calls

## Features

### Automatic Middleware Plugin
All schemas created with this package automatically include the standard middleware plugin:
- Version increment (`__v`) on all mutating operations
- `createdAt` timestamp (set once on creation, never overwritten)
- `updatedAt` timestamp (updated on every mutation)
- Validation enabled on all update operations

The middleware is applied as a Mongoose plugin, which is the recommended approach for extending schema functionality.

### Zod Integration
Convert Zod schemas to Mongoose schemas with automatic validation in pre and post middleware.

## Usage

### Creating Schemas with newSchema()

```typescript
import { newSchema } from '@prosopo/mongoose';

// The standard middleware plugin is automatically applied
const UserSchema = newSchema({
  name: { type: String, required: true },
  email: { type: String, required: true }
});
```

### Using the Plugin Directly

You can also apply the standard middleware plugin to existing schemas:

```typescript
import { Schema } from 'mongoose';
import { standardMiddlewarePlugin } from '@prosopo/mongoose';

const MySchema = new Schema({
  field: String
});

// Apply the plugin
MySchema.plugin(standardMiddlewarePlugin);
```
