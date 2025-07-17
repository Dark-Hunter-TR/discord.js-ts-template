import { ActivityType, Client } from 'discord.js';
import mongoose from 'mongoose';
import colors from 'colors';
import { Event, ExtendedClient } from '../../types';

async function connectDatabase(): Promise<void> {
    try {
        await mongoose.connect(process.env.MONGODB_URI || '', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as mongoose.ConnectOptions);
        console.log(colors.blue('✅ MongoDB Database Connection Established'));
    } catch (error) {
        console.error(colors.red('MongoDB Database Connection Error:'), error);
    }
}

function setCustomStatus(client: ExtendedClient): void {
    client.user?.setActivity({
        name: `Active`,
        type: ActivityType.Watching,
    });
}

const readyEvent: Event = {
    name: 'ready',
    once: true,
    execute: async (client: Client) => {
        try {
            const extendedClient = client as ExtendedClient;
            await connectDatabase();
            setCustomStatus(extendedClient);
            console.log(colors.green(`✅ The bot successfully logged in as ${extendedClient.user?.tag}!`));
        } catch (error) {
            console.error(colors.red('Ready event error:'), error);
        }
    }
};

export default readyEvent; 
