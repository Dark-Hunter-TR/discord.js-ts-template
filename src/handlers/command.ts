import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { AsciiTable3 as AsciiTable } from 'ascii-table3';
import { ExtendedClient, Command } from '../types';

/**
 * Optimized command handler for loading prefix commands
 * @param {ExtendedClient} client - Discord client object
 * @returns {Promise<{loaded: number, failed: number, executionTime?: string, error?: Error}>}
 */
const commandHandler = async (client: ExtendedClient): Promise<{
  loaded: number;
  failed: number;
  executionTime?: string;
  error?: Error;
}> => {
  try {
    if (!client?.commands || !client?.aliases) {
      throw new Error("Invalid client object: Missing commands or aliases maps.");
    }

    const commandsBasePath = path.join(process.cwd(), "src", "commands", "prefix");
    const table = new AsciiTable()
      .setHeading("Commands", "Status")
      .setStyle('unicode-single');

    const commandDirs = (await fs.readdir(commandsBasePath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory());
    
    let loadedCount = 0;
    let failedCount = 0;
    let startTime = performance.now();

    await Promise.all(commandDirs.map(async (dirEntry) => {
      const categoryDir = path.join(commandsBasePath, dirEntry.name);
      const categoryName = dirEntry.name;
      
      try {
        const commandFiles = (await fs.readdir(categoryDir))
          .filter(file => file.endsWith(".js") || file.endsWith(".ts") && !file.startsWith("_"));

        await Promise.all(commandFiles.map(async (file) => {
          const filePath = path.join(categoryDir, file);
          
          try {
            const stats = await fs.stat(filePath);
            
            // Import the command module
            const commandModule = await import(filePath);
            const command: Command = commandModule.default || commandModule;

            if (!command || typeof command !== 'object' || !command.name) {
              console.warn(chalk.yellow(`[WARNING] Invalid command structure: ${filePath}`));
              table.addRow(file, "⚠️ Invalid");
              failedCount++;
              return;
            }

            command.category = categoryName;
            command.path = filePath;

            client.commands.set(command.name, command);
            
            if (Array.isArray(command.aliases)) {
              for (const alias of command.aliases) {
                if (typeof alias === 'string') {
                  client.aliases.set(alias, command.name);
                }
              }
            }

            table.addRow(
              command.name, 
              chalk.green("✅")
            );
            
            loadedCount++;
          } catch (commandLoadError: unknown) {
            const errorMessage = commandLoadError instanceof Error 
              ? commandLoadError.message 
              : String(commandLoadError);
            console.error(chalk.red(`[ERROR] Error loading command ${file}: ${errorMessage}`));
            table.addRow(file, "❌ Hata");
            failedCount++;
          }
        }));
      } catch (categoryReadError: unknown) {
        const errorMessage = categoryReadError instanceof Error 
          ? categoryReadError.message 
          : String(categoryReadError);
        console.error(chalk.red(`[ERROR] Error reading category ${categoryName}: ${errorMessage}`));
      }
    }));

    const executionTime = (performance.now() - startTime).toFixed(2);
    
    console.log(chalk.blue(table.toString()));
    
    return { loaded: loadedCount, failed: failedCount, executionTime };
  } catch (mainError: unknown) {
    const error = mainError instanceof Error ? mainError : new Error(String(mainError));
    console.error(chalk.red(`[Fatal Error] Error in command loader: ${error.message}`));
    console.error(error);
    return { loaded: 0, failed: 0, error };
  }
};

export default commandHandler; 