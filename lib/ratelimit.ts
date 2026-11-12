import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 10 chat messages per minute per visitor
export const chatLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "cafe-chat",
});
