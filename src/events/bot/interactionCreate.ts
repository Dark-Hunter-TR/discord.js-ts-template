import { 
  EmbedBuilder, 
  PermissionsBitField, 
  Collection,
  CommandInteraction,
  Interaction,
  PermissionResolvable
} from "discord.js";
import { performance } from 'perf_hooks';
import ms from "ms";
import config from '../../configs/bot';
import { Event, ExtendedClient, SlashCommand } from "../../types";

async function handleCommandPrerequisites(
  client: ExtendedClient, 
  interaction: CommandInteraction, 
  command: SlashCommand
): Promise<boolean> {
  const isOwner = config.OWNERS.includes(interaction.user.id);
  const errorEmbed = new EmbedBuilder().setColor(config.COLORS.RED as any);

  if (command.settings?.isOwner && !isOwner) {
    const ownerEmbed = new EmbedBuilder()
      .setTitle("🚫 Unauthorized Access")
      .setDescription('This command is only available to bot owners.')
      .setColor(config.COLORS.RED as any);
    await interaction.reply({ embeds: [ownerEmbed], ephemeral: true });
    return false;
  }

  if (command.settings?.isDisabled && !isOwner) {
    errorEmbed.setTitle("🔒 Command Temporarily Disabled")
      .setDescription("This command is currently unavailable for maintenance or update. Please try again later.");
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return false;
  }

  if (command.settings?.isBeta === true && !isOwner) {
    errorEmbed.setTitle("🔒 Beta Feature")
      .setDescription('🚫 This command is only available to beta users!');
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return false;
  }

  if (command.userPerms && interaction.guild) {
    const resolvedPerms = typeof command.userPerms === 'string' 
      ? [command.userPerms as PermissionResolvable] 
      : command.userPerms as PermissionResolvable[];
      
    if (!interaction.memberPermissions?.has(resolvedPerms)) {
      errorEmbed.setTitle("🔐 Insufficient User Permission")
        .setDescription(`You need \`${command.userPerms}\` authorization to use this command.`);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }
  }

  if (command.botPerms && interaction.guild) {
    const resolvedPerms = typeof command.botPerms === 'string' 
      ? [command.botPerms as PermissionResolvable] 
      : command.botPerms as PermissionResolvable[];
      
    if (!interaction.guild.members.me?.permissions.has(resolvedPerms)) {
      errorEmbed.setTitle("⚠️ Bot Permission Error")
        .setDescription(`I need \`${command.botPerms}\` authorization to run this command.`);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return false;
    }
  }

  if (command.cooldown) {
    const commandName = interaction.commandName;
    const now = Date.now();
    const cooldownCollection = client.cooldowns.get(commandName) || new Collection<string, number>();
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (cooldownCollection.has(interaction.user.id)) {
      const expirationTime = cooldownCollection.get(interaction.user.id)! + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const cooldownEmbed = new EmbedBuilder()
          .setColor(config.COLORS.RED as any)
          .setTitle("⏳ Command Cooldown Active")
          .setDescription(`Please wait ${ms(timeLeft * 1000, { long: true })} before using this command again.`)
          .setFooter({ text: "Command cooldown is applied to prevent spam on the server." });
        await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        return false;
      }
    }

    cooldownCollection.set(interaction.user.id, now);
    client.cooldowns.set(commandName, cooldownCollection);
    setTimeout(() => {
      cooldownCollection.delete(interaction.user.id);
      if (cooldownCollection.size === 0) {
        client.cooldowns.delete(commandName);
      }
    }, cooldownAmount);
  }

  return true;
}

const interactionCreateEvent: Event = {
  name: 'interactionCreate',
  execute: async (interaction: Interaction) => {
    // Discord.js v14 için clienti global olarak alıyoruz
    const client = interaction.client as ExtendedClient;
    
    if (!interaction.isCommand()) return;

    try {
      const startTime = performance.now();
      const commandName = interaction.commandName;

      const command = client.slashCommands.get(commandName);

      if (!command) return;

      if (!client.cooldowns) {
        client.cooldowns = new Collection();
      }

      const canExecute = await handleCommandPrerequisites(client, interaction, command);
      if (!canExecute) return;

      await command.run(client, interaction);

      const endTime = performance.now();

    } catch (error: unknown) {
      console.error('Interaction Processing Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      const errorEmbed = new EmbedBuilder()
        .setColor(config.COLORS.RED as any)
        .setTitle("❌ Command Error")
        .setDescription("An error occurred while executing the command. Please try again later.")
        .addFields(
          { 
            name: "Error Details", 
            value: errorMessage,
            inline: false
          },
          {
            name: "Suggestion", 
            value: "Please report this error to the authorities.",
            inline: false
          }
        )
        .setTimestamp();

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (replyError) {
        console.error('Error occurred while sending error response:', replyError);
      }
    }
  }
};

export default interactionCreateEvent; 