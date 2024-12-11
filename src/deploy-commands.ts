import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { pingCommand } from './commands/ping.js';
import {whoisCommand} from "./commands/whois.js";

config();

const commands = [
    pingCommand.toJSON(),
    whoisCommand.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

export async function deployCommands() {
    try {
        console.log('アプリケーションのスラッシュコマンドを更新中...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands },
        );

        console.log('スラッシュコマンドの更新が完了しました！');
    } catch (error) {
        console.error('エラーが発生しました：', error);
    }
}