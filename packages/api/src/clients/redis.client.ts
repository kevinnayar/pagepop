import IORedis from 'ioredis';

export function getRedisConnection(url: string) {
  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
  });
  return connection;
}
