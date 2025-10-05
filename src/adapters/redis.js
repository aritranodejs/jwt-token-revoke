/**
 * Redis storage adapter for JWT blacklist
 * Usage: const blacklist = new JWTBlacklist({ storage: new RedisAdapter(redisClient) })
 */
class RedisAdapter {
  constructor(redisClient, options = {}) {
    this.client = redisClient;
    this.prefix = options.prefix || 'jwt_blacklist:';
  }

  async set(token, expiresAt) {
    const key = this.prefix + token;
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
    
    if (ttl > 0) {
      await this.client.setEx(key, ttl, expiresAt.toString());
    }
  }

  async get(token) {
    const key = this.prefix + token;
    const value = await this.client.get(key);
    return value ? parseInt(value) : null;
  }

  async delete(token) {
    const key = this.prefix + token;
    const result = await this.client.del(key);
    return result > 0;
  }

  async cleanup(now) {
    // Redis handles expiration automatically, so no cleanup needed
    return 0;
  }

  async count() {
    const keys = await this.client.keys(this.prefix + '*');
    return keys.length;
  }
}

module.exports = RedisAdapter;


