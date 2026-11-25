// Production Configuration Guide
// This file documents the recommended production setup for the CRM backend

export const productionConfig = {
  // Server Configuration
  server: {
    port: 5000, // Use environment variable NODE_PORT to override
    nodeEnv: 'production',
    shutdownTimeout: 30000, // 30 seconds for graceful shutdown
    bodyLimit: '10mb', // Max body size for requests
  },

  // Logging Configuration
  logging: {
    level: 'INFO', // DEBUG, INFO, WARN, ERROR
    // Use LOG_LEVEL environment variable to override
    // Production: INFO or WARN
    // Development: DEBUG
  },

  // Database Configuration
  database: {
    // Use MONGODB_URI environment variable
    // Ensure MongoDB is configured for:
    // - Replica set enabled (for transactions)
    // - Connection pooling enabled
    // - Proper authentication
    retryWrites: true,
    w: 'majority', // Ensure durability
  },

  // Redis Configuration
  redis: {
    // Use REDIS_URL environment variable
    // Recommended format: redis://username:password@host:port/db
    // - Enable persistence (RDB or AOF)
    // - Configure maxmemory policy
    // - Use high availability setup (Redis Sentinel or Cluster)
    reconnectStrategy: {
      maxRetries: 10,
      retryDelayMs: 50,
    },
  },

  // Security Settings
  security: {
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    // Ensure CORS is properly configured for production domains
    // Verify SESSION_SECRET is strong and unique
    // Use HTTPS in production
    // Set secure cookies: true
    // Set httpOnly cookies: true
    // Set sameSite cookies: strict
  },

  // Performance Optimization
  performance: {
    // Request logging: Use DEBUG log level in development only
    // Cache strategies: Leverage Redis for sessions and data caching
    // Database indexing: Ensure all frequently queried fields are indexed
    // Connection pooling: Configure appropriate pool sizes
    // Rate limiting: Implement rate limiting per endpoint
  },

  // Monitoring & Observability
  monitoring: {
    // Health check endpoints:
    // - GET /health/live - Liveness probe (quick check)
    // - GET /health/ready - Readiness probe (full check)
    // - GET /health - Alias for ready
    
    // Metrics to monitor:
    // - Memory usage (alert at > 80%)
    // - Database connection status
    // - Redis connection status
    // - Request latency (p50, p95, p99)
    // - Error rate
    // - Uptime
  },

  // Deployment Checklist
  deployment: {
    preDeployment: [
      '✓ Build TypeScript: npm run build',
      '✓ Run type checking: npm run typecheck',
      '✓ Test end-to-end: npm test',
      '✓ Verify all environment variables are set',
      '✓ Check database connectivity',
      '✓ Check Redis connectivity',
      '✓ Review logs for any warnings',
    ],
    
    postDeployment: [
      '✓ Monitor /health/ready endpoint',
      '✓ Check application logs for errors',
      '✓ Verify database connections are stable',
      '✓ Test core API endpoints',
      '✓ Monitor memory usage and CPU',
      '✓ Verify CORS is working correctly',
    ],
  },

  // Environment Variables Required
  requiredEnvVars: [
    'NODE_ENV', // production
    'PORT', // 5000
    'MONGODB_URI', // MongoDB connection string
    'MONGODB_DB_NAME', // Database name
    'REDIS_URL', // Redis connection string
    'JWT_SECRET', // For JWT token signing
    'REFRESH_TOKEN_SECRET', // For refresh tokens
    'CLIENT_URL', // Frontend URL
    'SERVER_URL', // Backend URL
    'ALLOWED_ORIGINS', // CORS origins
    'GOOGLE_CLIENT_ID', // OAuth
    'GOOGLE_CLIENT_SECRET', // OAuth
    'GOOGLE_GEMINI_API_KEY', // AI service
    'SMTP_HOST', // Email service
    'SMTP_PORT', // Email service port
    'SMTP_USER', // Email credentials
    'SMTP_PASS', // Email credentials
    'SMTP_FROM', // Email sender address
  ],

  // Docker Deployment Notes
  docker: {
    healthCheck: {
      test: 'CMD curl --fail http://localhost:5000/health/ready',
      interval: 30, // seconds
      timeout: 10, // seconds
      retries: 3,
      startPeriod: 40, // seconds to start checking
    },
    resources: {
      requests: {
        memory: '256Mi',
        cpu: '250m',
      },
      limits: {
        memory: '512Mi',
        cpu: '500m',
      },
    },
  },
};

export default productionConfig;
