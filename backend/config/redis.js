import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config();

const redisURL = process.env.REDIS_URL;

const client = createClient({
  url: redisURL,
});

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

await client.connect();

export default client;
