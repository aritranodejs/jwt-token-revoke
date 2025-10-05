# jwt-token-blacklist

A simple and efficient JWT token blacklisting library for immediate token revocation on logout.

## Installation

```bash
npm install jwt-token-revoke
```

## Quick Start

```javascript
const { JWTBlacklist, blacklistMiddleware } = require('jwt-token-revoke');

// Create blacklist instance
const blacklist = new JWTBlacklist();

// Blacklist a token (e.g., on logout)
await blacklist.blacklist(token);

// Check if token is blacklisted
const isBlacklisted = await blacklist.isBlacklisted(token);

// Use with Express middleware
app.use(blacklistMiddleware(blacklist));
```

## Features

- ✅ Instant token revocation on logout
- ✅ In-memory storage (default)
- ✅ Redis adapter support
- ✅ Automatic cleanup of expired tokens
- ✅ Express middleware included
- ✅ Custom storage adapters
- ✅ Zero dependencies (except jsonwebtoken)

## Usage Examples

### Basic Usage

```javascript
const { JWTBlacklist } = require('jwt-token-revoke');

const blacklist = new JWTBlacklist();

// Logout endpoint
app.post('/logout', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  
  await blacklist.blacklist(token);
  
  res.json({ message: 'Logged out successfully' });
});
```

### Logout All Devices

```javascript
// Revoke all active tokens for a user (example)
app.post('/logout-all', async (req, res) => {
  const userId = req.user.id; // assume user identified
  const tokens = await getUserTokens(userId); // fetch all active tokens for user

  for (const token of tokens) {
    await blacklist.blacklist(token);
  }

  res.json({ message: 'Logged out from all devices' });
});
```

### With Express Middleware

```javascript
const { JWTBlacklist, blacklistMiddleware } = require('jwt-token-revoke');

const blacklist = new JWTBlacklist();

// Apply middleware to protected routes
app.use('/api', blacklistMiddleware(blacklist));

app.get('/api/profile', (req, res) => {
  // This route is protected - blacklisted tokens are rejected
  res.json({ user: req.user });
});
```

### With Redis

```javascript
const redis = require('redis');
const { JWTBlacklist, RedisAdapter } = require('jwt-token-revoke');

const redisClient = redis.createClient();
await redisClient.connect();

const blacklist = new JWTBlacklist({
  storage: new RedisAdapter(redisClient)
});
```

### Custom Configuration

```javascript
const blacklist = new JWTBlacklist({
  cleanupInterval: 1800000, // 30 minutes
  autoCleanup: true // Enable automatic cleanup
});
```

## API Reference

### JWTBlacklist

#### `constructor(options)`
- `options.storage` - Storage adapter (default: Map)
- `options.cleanupInterval` - Cleanup interval in ms (default: 3600000)
- `options.autoCleanup` - Enable auto cleanup (default: true)

#### `async blacklist(token)`
Blacklist a JWT token immediately

#### `async isBlacklisted(token)`
Check if a token is blacklisted

#### `async remove(token)`
Remove a token from blacklist

#### `async cleanup()`
Manually trigger cleanup of expired tokens

#### `async count()`
Get count of blacklisted tokens

### blacklistMiddleware(blacklistInstance, options)

Express middleware to reject blacklisted tokens

- `blacklistInstance` - Instance of JWTBlacklist
- `options.getToken` - Custom function to extract token from request

## License

MIT
