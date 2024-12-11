import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

export const whoisCommand = new SlashCommandBuilder()
    .setName('whois')
    .setDescription('指定したドメインまたはIPアドレスのWHOIS情報を取得します')
    .addStringOption(option =>
        option
            .setName('target')
            .setDescription('検索対象（ドメインまたはIPアドレス）')
            .setRequired(true)
    );

export async function handleWhoisCommand(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getString('target', true);

    await interaction.reply('WHOIS情報を取得中...');

    try {
        // 基本的なバリデーション
        if (!isValidTarget(target)) {
            await interaction.editReply('無効なドメインまたはIPアドレスです。');
            return;
        }

        const {stdout, stderr} = await execAsync(`whois ${target}`);

        if (stderr) {
            throw new Error(stderr);
        }

        // 結果を整形して送信
        const formattedResult = formatWhoisResult(stdout);

        // 結果が長い場合は分割して送信
        const chunks = splitIntoChunks(formattedResult);

        if (chunks.length === 1) {
            await interaction.editReply({
                content: `🔍 ${target} のWHOIS情報:\n\`\`\`${chunks[0]}\`\`\``,
            });
        } else {
            // 最初のチャンクを編集して送信
            await interaction.editReply({
                content: `🔍 ${target} のWHOIS情報 (1/${chunks.length}):\n\`\`\`${chunks[0]}\`\`\``,
            });

            // 残りのチャンクをフォローアップとして送信
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp({
                    content: `WHOIS情報 (${i + 1}/${chunks.length}):\n\`\`\`${chunks[i]}\`\`\``,
                });
            }
        }

    } catch (error: any) {
        console.error('Whois error:', error);
        await interaction.editReply(`エラーが発生しました: ${error.message}`);
    }
}

function isValidTarget(target: string): boolean {
    // ドメイン名のパターン
    const domainPattern = /^[a-zA-Z0-9][-a-zA-Z0-9.]{0,253}[a-zA-Z0-9]$/;

    // IPv4アドレスのパターン
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    // IPv6アドレスのパターン
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:){0,6}:[0-9a-fA-F]{1,4}$/;

    return domainPattern.test(target) || ipv4Pattern.test(target) || ipv6Pattern.test(target);
}

function formatWhoisResult(output: string): string {
    // 不要な空行を削除
    return output
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n')
        .trim();
}

function splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const maxChunkLength = 1900; // Discordのメッセージ制限に余裕を持たせる

    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxChunkLength) {
            chunks.push(currentChunk.trim());
            currentChunk = line;
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}