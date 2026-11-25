# Backend Production Upgrade Guide

This document outlines all production-grade improvements made to the backend server.

## Overview of Improvements

### 1. **Comprehensive Logging System** (`utils/logger.ts`)

A structured logging utility with multiple levels and contextual information:

- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Controlled via**: `LOG_LEVEL` environment variable
- **Features**:
  - Timestamp on every log entry
  - Contextual information (module/service name)
  - Formatted output for easy parsing
  - Data and error stack traces included

**Usage**:
```typescript
import { logger } from './utils/logger.js';

logger.info('Server started', { port: 5000 }, 'Bootstrap');
logger.warn('High memory usage', { percent: 85 }, 'Monitor');
logger.error('Database error', dbError, 'Database');
logger.debug('Request details', requestData, 'HTTP');
```

### 2. **Health Check Endpoint** (`utils/healthCheck.ts`)

Comprehensive health monitoring system with three states:

**Endpoints**:
- `GET /health/live` - Liveness probe (quick, for load balancers)
- `GET /health/ready` - Readiness probe (full checks)
- `GET /health` - Alias for readiness probe

**Health Status**:
- **Healthy (200)**: All services operational
- **Degraded (503)**: At least one service has issues or memory > 85%
- **Unhealthy (503)**: Database is down

**Checks Performed**:
- MongoDB connectivity and latency
- Redis connectivity and latency
- Memory usage (% of total)
- Process uptime

**Response Example**:
```json
{
  "status": "healthy",
  "timestamp": "2025-03-25T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": { "status": "connected", "latency": 2 },
    "redis": { "status": "connected", "latency": 1 },
    "memory": { "used": 256, "total": 1024, "percentage": 25 }
  }
}
```

### 3. **Graceful Shutdown Handler** (`utils/shutdown.ts`)

Handles server shutdown gracefully with proper cleanup:

**Signals Handled**:
- `SIGTERM` - Termination signal
- `SIGINT` - Interrupt signal (Ctrl+C)
- Uncaught exceptions
- Unhandled promise rejections

**Shutdown Process**:
1. Stops accepting new requests
2. Closes MongoDB connections
3. Closes Redis connections
4. Logs all shutdown events
5. Exits gracefully (or forces after 30 seconds)

**Features**:
- Configurable shutdown timeout (default 30 seconds)
- Prevents duplicate shutdown attempts
- Detailed logging at each stage
- Forces exit if timeout exceeded

### 4. **Error Handling Middleware** (`utils/errorHandler.ts`)

Centralized error handling with structured responses:

**Features**:
- Consistent error response format
- Different responses for development vs production
- HTTP status code mapping
- Stack traces in development
- Async error wrapping

**Error Response Format**:
```json
{
  "status": "error",
  "statusCode": 500,
  "message": "Internal Server Error",
  "timestamp": "2025-03-25T10:30:00.000Z",
  "stack": "... (development only)"
}
```

**Usage**:
```typescript
import { asyncHandler, AppError } from './utils/errorHandler.js';

app.get('/api/data', asyncHandler(async (req, res) => {
  if (!req.body.id) {
    throw new AppError('ID is required', 400);
  }
  // ... rest of handler
}));
```

### 5. **HTTP Logging Middleware** (`utils/httpLogger.ts`)

Automatic logging of all HTTP requests:

**Logs Include**:
- HTTP method and path
- Status code
- Response time (milliseconds)
- Query parameters and URL params
- Error details for 4xx and 5xx responses

**Log Levels**:
- 5xx errors: ERROR level
- 4xx errors: WARN level
- 2xx-3xx success: DEBUG level

### 6. **Enhanced Configuration Files**

#### Database Connection (`config/db.ts`)
- Added event handlers for connection monitoring
- Improved error logging
- Replica set configuration support
- Write concern set to 'majority'

#### Redis Connection (`config/redis.ts`)
- Automatic reconnection strategy
- Comprehensive event logging
- Max retry limits (10 attempts)
- Connection pooling support

#### Production Configuration (`config/production.ts`)
- Centralized configuration documentation
- Deployment checklist
- Environment variable requirements
- Docker health check configuration
- Resource recommendations

### 7. **Enhanced Server Initialization** (`server.ts`)

**Improvements**:
- Structured bootstrap process with logging
- Security headers added
- Proper middleware ordering
- Request size limits (10MB)
- 404 route handler
- Graceful shutdown setup

**Security Headers Added**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## Environment Variables

### Required in Production:
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=INFO
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB_NAME=xeno-crm
REDIS_URL=redis://:password@host:6379
JWT_SECRET=your-secret-key-here
REFRESH_TOKEN_SECRET=your-refresh-secret-here
CLIENT_URL=https://yourdomain.com
SERVER_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_GEMINI_API_KEY=your-api-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@yourdomain.com
```

## Health Check Integration

### For Kubernetes:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 20
  periodSeconds: 10
```

### For Docker:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:5000/health/ready || exit 1
```

## Monitoring Recommendations

### Metrics to Track:
1. **Health Status** - Frequency of degraded/unhealthy checks
2. **Request Latency** - P50, P95, P99 response times
3. **Error Rate** - Errors per minute
4. **Memory Usage** - Alert if > 85%
5. **Database Latency** - Alert if > 100ms
6. **Redis Latency** - Alert if > 50ms
7. **Uptime** - Track restart frequency

### Log Aggregation:
Collect logs with structured format for easy parsing:
- Use ELK Stack, CloudWatch, or similar
- Filter by log level and context
- Set up alerts for ERROR level logs

## Deploy Checklist

**Before Deployment**:
- [ ] Run: `npm run build`
- [ ] Run: `npm run typecheck`
- [ ] Verify all environment variables
- [ ] Test locally with `npm run dev`
- [ ] Check database connectivity
- [ ] Check Redis connectivity

**After Deployment**:
- [ ] Monitor `/health/ready` endpoint
- [ ] Check application logs for errors
- [ ] Verify database connections are stable
- [ ] Test all API endpoints
- [ ] Monitor memory and CPU usage
- [ ] Set up log aggregation

## Performance Tips

1. **Database**:
   - Enable connection pooling
   - Index frequently queried fields
   - Use pagination for large result sets

2. **Redis**:
   - Enable persistence (RDB/AOF)
   - Set appropriate maxmemory policy
   - Use Redis Cluster for high availability

3. **Application**:
   - Use gzip compression for responses
   - Implement request rate limiting
   - Cache frequently accessed data
   - Use CDN for static assets

4. **Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Monitor request performance
   - Track database query performance
   - Set up uptime monitoring

## Troubleshooting

### High Memory Usage
- Check for memory leaks in your code
- Monitor with: `node --inspect` and Chrome DevTools
- Review logs for repeated errors

### Slow Response Times
- Check database query performance
- Monitor Redis latency
- Review HTTP logs for slow requests
- Check network latency

### Connection Issues
- Verify MongoDB connection string
- Verify Redis connection string
- Check firewall rules
- Verify credentials are correct

## Version Requirements

- Node.js: 18.0.0 or higher
- Express: 5.1.0 or higher
- MongoDB: 4.4 or higher
- Redis: 6.0 or higher

## Related Files

- [Server Configuration](./server.ts)
- [Logger Utility](./utils/logger.ts)
- [Health Check](./utils/healthCheck.ts)
- [Shutdown Handler](./utils/shutdown.ts)
- [Error Handler](./utils/errorHandler.ts)
- [HTTP Logger](./utils/httpLogger.ts)
- [Production Config](./config/production.ts)
