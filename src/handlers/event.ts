import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { AsciiTable3 as AsciiTable } from 'ascii-table3';
import { ExtendedClient, Event } from '../types';

/**
 * Event handler for loading Discord events
 * @param {ExtendedClient} client - Discord client object
 * @returns {Promise<{loaded: number, failed: number, executionTime?: string, error?: Error}>}
 */
const eventHandler = async (client: ExtendedClient): Promise<{
  loaded: number;
  failed: number;
  executionTime?: string;
  error?: Error;
}> => {
  try {
    const eventsPath = path.join(process.cwd(), 'src', 'events');
    const table = new AsciiTable()
      .setHeading("Events", "Status")
      .setStyle('unicode-single');

    const eventFolders = (await fs.readdir(eventsPath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let loadedCount = 0;
    let failedCount = 0;
    const startTime = performance.now();

    await Promise.all(eventFolders.map(async (folder) => {
      const categoryPath = path.join(eventsPath, folder);
      const eventFiles = (await fs.readdir(categoryPath))
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

      await Promise.all(eventFiles.map(async (file) => {
        try {
          const filePath = path.join(categoryPath, file);
          const eventModule = await import(filePath);
          const event: Event = eventModule.default || eventModule;

          if (!event || !event.name || typeof event.execute !== 'function') {
            console.warn(chalk.yellow(`[WARNING] Invalid event structure in ${file}`));
            table.addRow(file, "⚠️ Invalid");
            failedCount++;
            return;
          }

          if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
          } else {
            client.on(event.name, (...args) => event.execute(...args));
          }

          table.addRow(event.name, chalk.green("✅"));
          loadedCount++;
        } catch (eventError: unknown) {
          const errorMessage = eventError instanceof Error 
            ? eventError.message 
            : String(eventError);
          console.error(chalk.red(`[ERROR] Failed to load event ${file}: ${errorMessage}`));
          table.addRow(file, chalk.red("❌"));
          failedCount++;
        }
      }));
    }));

    const executionTime = (performance.now() - startTime).toFixed(2);
    console.log(chalk.blue(table.toString()));

    return { loaded: loadedCount, failed: failedCount, executionTime };
  } catch (error: unknown) {
    const mainError = error instanceof Error ? error : new Error(String(error));
    console.error(chalk.red(`[FATAL ERROR] Event handler failed: ${mainError.message}`));
    console.error(mainError);
    return { loaded: 0, failed: 0, error: mainError };
  }
};

export default eventHandler; 