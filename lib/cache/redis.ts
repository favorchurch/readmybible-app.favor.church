/**
 * Lazy, fault-tolerant Redis client for Read My Bible.
 *
 * Ported from connect.favor.church's redisClient.ts pattern. Redis is
 * effectively required in production (session/group/campus reads are cached
 * here) but the app must never hang or 500 because Redis had a bad moment:
 * every command degrades to a cache miss instead of throwing.
 *
 * Key prefix is REDIS_KEY_PREFIX if set, otherwise derived from VERCEL_ENV:
 *   readmybible:prod:
 *   readmybible:preview:<branch>:
 *   readmybible:local:
 */
import "server-only";

import { createClient, type RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "";
const REDIS_TIMEOUT_MS = 1500;

function derivePrefix(): string {
  if (process.env.REDIS_KEY_PREFIX) return process.env.REDIS_KEY_PREFIX;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "readmybible:prod:";
  if (vercelEnv === "preview") {
    const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "unknown";
    return `readmybible:preview:${branch}:`;
  }
  return "readmybible:local:";
}

export const KEY_PREFIX = derivePrefix();

let client: RedisClientType | null = null;
let connectWindowFailed = false;
let connecting: Promise<void> | null = null;

function getClient(): RedisClientType | null {
  if (!REDIS_URL) return null;
  if (!client) {
    connectWindowFailed = false;
    const newClient: RedisClientType = createClient({ url: REDIS_URL });
    client = newClient;
    newClient.on("error", (err) => console.warn("[redis] client error:", (err as Error).message));
    connecting = newClient.connect().then(
      () => undefined,
      (err) => {
        console.warn("[redis] connect failed:", (err as Error).message);
        if (client === newClient) client = null;
        connecting = null;
      },
    );
  }
  return client;
}

export function isRedisEnabled(): boolean {
  return Boolean(REDIS_URL);
}

async function waitUntilReady(c: RedisClientType): Promise<boolean> {
  if (c.isReady) return true;
  if (!connecting || connectWindowFailed) return false;
  let timer: ReturnType<typeof setTimeout>;
  const timedOut = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => resolve("timed-out"), REDIS_TIMEOUT_MS);
  });
  const outcome = await Promise.race([connecting.then(() => "settled" as const), timedOut]);
  clearTimeout(timer!);
  if (outcome === "timed-out") connectWindowFailed = true;
  return outcome === "settled" && c.isReady;
}

/** Get a string value by key (prefix applied), or null on miss/unavailable. */
export async function redisGet(key: string): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  if (!c.isReady && !(await waitUntilReady(c))) return null;
  try {
    return await c.get(KEY_PREFIX + key);
  } catch (error) {
    console.warn("[redis] GET failed:", key, error);
    return null;
  }
}

/** Set a string value with a TTL in seconds (prefix applied). Best-effort. */
export async function redisSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  if (!c.isReady && !(await waitUntilReady(c))) return;
  try {
    await c.setEx(KEY_PREFIX + key, ttlSeconds, value);
  } catch (error) {
    console.warn("[redis] SETEX failed:", key, error);
  }
}

/** Delete one or more keys (prefix applied). Best-effort. */
export async function redisDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const c = getClient();
  if (!c) return;
  if (!c.isReady && !(await waitUntilReady(c))) return;
  try {
    await c.del(keys.map((k) => KEY_PREFIX + k));
  } catch (error) {
    console.warn("[redis] DEL failed:", keys, error);
  }
}

/**
 * Cache-aside helper: return the cached JSON value for `key`, or call
 * `loader()`, cache the result for `ttlSeconds`, and return it. A Redis
 * outage or a loader error is never masked as a false cache hit -- loader
 * errors propagate to the caller.
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await redisGet(key);
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // Corrupt cache entry -- fall through to reload.
    }
  }
  const value = await loader();
  void redisSetEx(key, ttlSeconds, JSON.stringify(value));
  return value;
}
