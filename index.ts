import { GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ExtendedClient } from './src/types';

// Load environment variables
dotenv.config();

// Create client instance with all intents and partials
const client = new ExtendedClient({
  intents: Object.values(GatewayIntentBits).filter(intent => typeof intent === 'number') as GatewayIntentBits[],
  partials: Object.values(Partials).filter(partial => typeof partial === 'number') as Partials[],
});

// Import config
import config from './src/configs/bot';
client.config = config;
client.prefix = config.PREFIX;

process.on("unhandledRejetion", async (reason, promise) => {
  console.log(reason, promise);
});
process.on("uncaughtException", async (err) => {
  console.log(err);
});
process.on("uncaughtExceptMonitor", async (err, origin) => {
  console.log(err, origin);
});

// Export client for use in other modules
export default client;

// Load and initialize all handlers
const handlersDir = path.join(process.cwd(), 'src', 'handlers');
fs.readdirSync(handlersDir).forEach(async (handler) => {
  const handlerPath = path.join(handlersDir, handler);
  const handlerModule = await import(handlerPath);
  handlerModule.default(client);
});

// Login with token
client.login(process.env.BOT_TOKEN); 