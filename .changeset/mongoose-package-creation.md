---
"@prosopo/mongoose": minor
"@prosopo/database": minor
"@prosopo/types-database": minor
---

Create new @prosopo/mongoose package with standard middleware plugin and utilities. This package consolidates mongoose-related utilities and implements standard middleware as a Mongoose plugin for consistent data handling across the application.

Key features:
- Centralized mongoose connection management with optimized timeout and heartbeat settings
- Standard middleware plugin for automatic timestamp management (createdAt, updatedAt)
- Version increment middleware for mutation operations
- Safe model creation using mongoose's overwriteModels flag
- Zod integration with enhanced validation
- All schemas created with helper functions have timestamps enabled by default

Changes:
- New @prosopo/mongoose package with connection, middleware, schema, and zodMapper utilities
- Updated @prosopo/database to use createMongooseConnection() and getOrCreateModel()
- Updated @prosopo/types-database schemas to use newSchema() with automatic middleware application
