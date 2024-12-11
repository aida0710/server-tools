import {Client, Events, GatewayIntentBits} from 'discord.js';
import {config} from 'dotenv';
import {deployCommands} from './deploy-commands.js';
import {handlePingCommand} from './commands/ping.js';
import {handleWhoisCommand} from "./commands/whois.js";

config();

// クライアントインスタンスの作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

// クライアント準備完了時のコマンド登録
client.once(Events.ClientReady, async (c) => {
    console.log(`準備完了！ ${c.user.tag} としてログインしました`);
    await deployCommands();
});

// スラッシュコマンドの処理
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case 'ping':
            await handlePingCommand(interaction);
            break;
        case 'whois':
            await handleWhoisCommand(interaction);
            break;
        default:
            await interaction.reply('不明なコマンドです！');
    }
});

// Discordにログイン
client.login(process.env.DISCORD_TOKEN).then(r => {
});