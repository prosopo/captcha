# @prosopo/mongoose

## 1.0.0

### Major Changes

- Initial release of the Mongoose utilities package
- Added `createMongooseConnection()` for creating MongoDB connections
- Added standard middleware for automatic timestamp management (createdAt, updatedAt)
- Added version increment middleware for all mutating operations
- Added `createSchemaWithMiddleware()` for creating schemas with middleware pre-applied
- Added `getOrCreateModel()` for safe model creation that handles multiple calls
- Added `createSchemaBuilder()` for fluent schema and model creation
- Added `createModelFromZodSchema()` for Zod-to-Mongoose schema mapping with validation
- Added comprehensive test coverage
