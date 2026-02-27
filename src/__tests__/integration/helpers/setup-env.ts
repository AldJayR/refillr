/**
 * Integration test setup file.
 *
 * This runs BEFORE any test modules are imported, so env.server.ts
 * sees valid values when it validates process.env at load time.
 *
 * We point MONGODB_URI to the test database so that handler functions
 * (which call connectToDatabase() internally) hit the right DB.
 */

process.env.MONGODB_URI = 'mongodb://localhost:27017/refillr_test'
process.env.CLERK_SECRET_KEY = 'sk_test_integration_test_placeholder'
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_integration_test_placeholder'
process.env.VITE_MAPBOX_ACCESS_TOKEN = 'pk_test_integration_test_placeholder'
process.env.NODE_ENV = 'test'
