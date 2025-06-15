import { ColorResolvable, EmbedBuilder, Message } from "discord.js";
import { Command, ExtendedClient } from "../../../types";

const pingCommand: Command = {
  name: "ping",
  description: "Check the bot's latency and API response time.",
  aliases: [],
  settings: {
    isOwner: false,
    isBeta: false,
    isDisabled: false,
    cooldown: 5,
  },
  run: async (client: ExtendedClient, message: Message, args: string[]) => {
    const apiPing = client.ws.ping;
    const embed = new EmbedBuilder()
      .setColor(client.config.COLORS.BLUE as ColorResolvable)
      .setTitle("🏓 Pong!")
      .setDescription(`API Latency: **${apiPing}ms**`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

export default pingCommand; 