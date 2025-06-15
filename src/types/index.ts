import { Client, ClientOptions, Collection, GatewayIntentBits, Partials, ColorResolvable, Message, CommandInteraction, PermissionResolvable } from 'discord.js';

export interface BotConfig {
  PREFIX: string;
  MESSAGES: {
    COOLDOWN_MESSAGE: string;
  };
  COLORS: {
    PURPLE: string;
    RED: string;
    BLUE: string;
    YELLOW: string;
    GREEN: string;
    GOLD: string;
    AQUA: string;
  };
  EMOJIS: {
    SUCCESS: string;
    ERROR: string;
    WARNING: string;
  };
  BETA: string[];
  OWNERS: string[];
}

export interface CommandSettings {
  isOwner?: boolean;
  isBeta?: boolean;
  isDisabled?: boolean;
  cooldown?: number;
}

export interface Command {
  name: string;
  description?: string;
  aliases?: string[];
  category?: string;
  path?: string;
  settings?: CommandSettings;
  permissions?: PermissionResolvable[];
  userPerms?: PermissionResolvable | PermissionResolvable[];
  botPerms?: PermissionResolvable | PermissionResolvable[];
  run: (client: ExtendedClient, message: Message, args: string[]) => Promise<any>;
}

export interface SlashCommand {
  data: {
    name: string;
    description?: string;
    options?: any[];
  };
  category?: string;
  settings?: CommandSettings;
  userPerms?: PermissionResolvable | PermissionResolvable[];
  botPerms?: PermissionResolvable | PermissionResolvable[];
  cooldown?: number;
  run: (client: ExtendedClient, interaction: CommandInteraction) => Promise<any>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<any> | any;
}

export class ExtendedClient extends Client {
  public commands: Collection<string, Command>;
  public aliases: Collection<string, string>;
  public cooldowns: Collection<string, Collection<string, number>>;
  public slashCommands: Collection<string, SlashCommand>;
  public config: BotConfig;
  public prefix: string;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
    this.aliases = new Collection();
    this.cooldowns = new Collection();
    this.slashCommands = new Collection();
    this.config = {} as BotConfig;
    this.prefix = "";
  }

  public exec(code: string): string {
    return require('child_process').execSync(code).toString();
  }

  public classes<T>(className: string): T {
    return require(`${process.cwd()}/src/classes/${className}`);
  }

  public functions<T>(utilsName: string): T {
    return require(`${process.cwd()}/src/functions/${utilsName}`);
  }
} 