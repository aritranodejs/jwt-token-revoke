const jwt = require('jsonwebtoken');

class JWTBlacklist {
  constructor(options = {}) {
    this.storage = options.storage || new Map(); // Default in-memory storage
    this.cleanupInterval = options.cleanupInterval || 3600000; // 1 hour
    
    // Start automatic cleanup of expired tokens
    if (options.autoCleanup !== false) {
      this.startAutoCleanup();
    }
  }

  /**
   * Blacklist a token immediately
   * @param {string} token - JWT token to blacklist
   * @returns {Promise<boolean>}
   */
  async blacklist(token) {
    try {
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token or token without expiration');
      }

      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Only store if token hasn't expired yet
      if (expiresAt > now) {
        await this.setItem(token, expiresAt);
        return true;
      }

      return false; // Token already expired
    } catch (error) {
      throw new Error(`Failed to blacklist token: ${error.message}`);
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(token) {
    try {
      const expiresAt = await this.getItem(token);
      
      if (!expiresAt) {
        return false;
      }

      // Check if token has expired
      if (Date.now() > expiresAt) {
        await this.removeItem(token);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  /**
   * Remove a token from blacklist (rarely needed)
   * @param {string} token - JWT token to remove
   * @returns {Promise<boolean>}
   */
  async remove(token) {
    return await this.removeItem(token);
  }

  /**
   * Clean up expired tokens from blacklist
   * @returns {Promise<number>} Number of tokens removed
   */
  async cleanup() {
    const now = Date.now();
    let count = 0;

    if (this.storage instanceof Map) {
      for (const [token, expiresAt] of this.storage.entries()) {
        if (now > expiresAt) {
          this.storage.delete(token);
          count++;
        }
      }
    } else if (typeof this.storage.cleanup === 'function') {
      count = await this.storage.cleanup(now);
    }

    return count;
  }

  /**
   * Start automatic cleanup interval
   */
  startAutoCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(err => console.error('Cleanup error:', err));
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get all blacklisted tokens count
   * @returns {Promise<number>}
   */
  async count() {
    if (this.storage instanceof Map) {
      return this.storage.size;
    } else if (typeof this.storage.count === 'function') {
      return await this.storage.count();
    }
    return 0;
  }

  // Storage abstraction methods
  async setItem(key, value) {
    if (this.storage instanceof Map) {
      this.storage.set(key, value);
    } else if (typeof this.storage.set === 'function') {
      await this.storage.set(key, value);
    }
  }

  async getItem(key) {
    if (this.storage instanceof Map) {
      return this.storage.get(key);
    } else if (typeof this.storage.get === 'function') {
      return await this.storage.get(key);
    }
    return null;
  }

  async removeItem(key) {
    if (this.storage instanceof Map) {
      return this.storage.delete(key);
    } else if (typeof this.storage.delete === 'function') {
      return await this.storage.delete(key);
    }
    return false;
  }
}

/**
 * Express middleware to check blacklisted tokens
 */
function blacklistMiddleware(blacklistInstance, options = {}) {
  const getToken = options.getToken || ((req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  });

  return async (req, res, next) => {
    try {
      const token = getToken(req);

      if (!token) {
        return next();
      }

      const isBlacklisted = await blacklistInstance.isBlacklisted(token);

      if (isBlacklisted) {
        return res.status(401).json({
          error: 'Token has been revoked',
          message: 'This token is no longer valid'
        });
      }

      next();
    } catch (error) {
      console.error('Blacklist middleware error:', error);
      next(error);
    }
  };
}

module.exports = {
  JWTBlacklist,
  blacklistMiddleware,
  // Re-export adapters for convenient imports
  RedisAdapter: (() => {
    try {
      // Lazy require to avoid forcing redis as a dependency
      return require('./adapters/redis');
    } catch (_) {
      return undefined;
    }
  })()
};


