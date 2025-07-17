import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { AsciiTable3 as AsciiTable } from 'ascii-table3';
import { ApplicationCommandDataResolvable, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';
import { ExtendedClient, SlashCommand } from '../types';

/**
 * Slash command handler for loading and registering slash commands
 * @param {ExtendedClient} client - Discord client object
 * @returns {Promise<{loaded: number, failed: number, registered: number, executionTime?: string, error?: Error}>}
 */
const slashCommandHandler = async (client: ExtendedClient): Promise<{
  loaded: number;
  failed: number;
  registered: number;
  executionTime?: string;
  error?: Error;
}> => {
  try {
    if (!process.env.BOT_TOKEN) {
      throw new Error('BOT_TOKEN is missing in environment variables');
    }

    if (!process.env.BOT_ID) {
      throw new Error('Client user ID is not available');
    }

    const slashCommandsPath = path.join(process.cwd(), 'src', 'commands', 'slash');
    const table = new AsciiTable()
      .setHeading("Slash Commands", "Status")
      .setStyle('unicode-single');

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    client.slashCommands = client.slashCommands || new Map();

    let loadedCount = 0;
    let failedCount = 0;
    let startTime = performance.now();

    try {
      await fs.access(slashCommandsPath);
    } catch (error) {
      console.warn(chalk.yellow('[WARNING] Slash commands directory does not exist, creating it...'));
      await fs.mkdir(slashCommandsPath, { recursive: true });
      return { loaded: 0, failed: 0, registered: 0, executionTime: '0.00' };
    }

    const categoryFolders = (await fs.readdir(slashCommandsPath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    await Promise.all(categoryFolders.map(async (category) => {
      const categoryPath = path.join(slashCommandsPath, category);
      const commandFiles = (await fs.readdir(categoryPath))
        .filter(file => file.endsWith('.js') || file.endsWith('.ts') && !file.startsWith('_'));

      await Promise.all(commandFiles.map(async (file) => {
        try {
          const filePath = path.join(categoryPath, file);
          const commandModule = await import(filePath);
          const command: SlashCommand = commandModule.default || commandModule;

          if (!command || !command.data || !command.data.name || !command.data.description) {
            console.warn(chalk.yellow(`[WARNING] Invalid slash command structure in ${file}`));
            table.addRow(file, "⚠️ Invalid");
            failedCount++;
            return;
          }

          const commandWithMeta = { ...command, category };

          client.slashCommands.set(command.data.name, commandWithMeta);
          commands.push(command.data as unknown as RESTPostAPIChatInputApplicationCommandsJSONBody);

          table.addRow(command.data.name, chalk.green("✅"));
          loadedCount++;
        } catch (cmdError: unknown) {
          const errorMessage = cmdError instanceof Error 
            ? cmdError.message 
            : String(cmdError);
          console.error(chalk.red(`[ERROR] Failed to load slash command ${file}: ${errorMessage}`));
          table.addRow(file, chalk.red("❌"));
          failedCount++;
        }
      }));
    }));

    let registeredCount = 0;

    if (commands.length > 0) {
      try {
        await rest.put(
          Routes.applicationCommands(process.env.BOT_ID as string),
          { body: commands }
        );
        registeredCount = commands.length;
        console.log(chalk.green(`[SUCCESS] Successfully registered ${registeredCount} slash commands`));
      } catch (regError: unknown) {
        const errorMessage = regError instanceof Error 
          ? regError.message 
          : String(regError);
        console.error(chalk.red(`[ERROR] Failed to register slash commands: ${errorMessage}`));
      }
    }

    const executionTime = (performance.now() - startTime).toFixed(2);
    console.log(chalk.blue(table.toString()));

    return {
      loaded: loadedCount,
      failed: failedCount,
      registered: registeredCount,
      executionTime
    };
  } catch (mainError: unknown) {
    const error = mainError instanceof Error ? mainError : new Error(String(mainError));
    console.error(chalk.red(`[FATAL ERROR] Slash command handler failed: ${error.message}`));
    console.error(error);
    return { loaded: 0, failed: 0, registered: 0, error };
  }
};

export default slashCommandHandler; 
