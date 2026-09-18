// Safe test environment defaults
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/secured_attendance_test";
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "institutional-super-secret-test-key-32-chars-long";
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
process.env.REDIS_HOST = process.env.REDIS_HOST || "localhost";
process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";
