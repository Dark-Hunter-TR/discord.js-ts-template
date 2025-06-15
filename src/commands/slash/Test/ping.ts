import { ColorResolvable, CommandInteraction, EmbedBuilder } from "discord.js";
import { ExtendedClient, SlashCommand } from "../../../types";

const pingCommand: SlashCommand = {
    data: {
        name: "ping",
        description: "Check the bot's latency and API response time.",
        options: []
    },
    settings: {
        isOwner: false,
        isBeta: false,
        isDisabled: false,
        cooldown: 5,
    },
    run: async (client: ExtendedClient, interaction: CommandInteraction) => {
        const apiPing = client.ws.ping;
        const embed = new EmbedBuilder()
            .setColor(client.config.COLORS.BLUE as ColorResolvable)
            .setTitle("🏓 Pong!")
            .setDescription(`API Latency: **${apiPing}ms**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

export default pingCommand;