import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

export const pingCommand = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('応答時間を確認したり、指定したホストにpingを送信します')
    .addSubcommand(subcommand =>
        subcommand
            .setName('bot')
            .setDescription('ボットの応答時間を確認します')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('host')
            .setDescription('指定したホストにpingを送信します')
            .addStringOption(option =>
                option
                    .setName('target')
                    .setDescription('pingを送信するホスト（ドメインまたはIPアドレス）')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('count')
                    .setDescription('ping送信回数（1-5回）')
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(5)
            )
    );

export async function handlePingCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'bot') {
        const sent = await interaction.reply({content: '計測中...', fetchReply: true});
        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({
            content: `応答時間: ${latency}ミリ秒\nAPI応答時間: ${Math.round(interaction.client.ws.ping)}ミリ秒`,
        });
    } else if (subcommand === 'host') {
        const target = interaction.options.getString('target', true);
        const count = interaction.options.getInteger('count') || 3; // デフォルトは3回

        await interaction.reply('pingを実行中...');

        try {
            // ホスト名やIPアドレスのバリデーション
            if (!isValidHostname(target)) {
                await interaction.editReply('無効なホスト名またはIPアドレスです。');
                return;
            }

            // OSに応じてpingコマンドを構築
            const command = process.platform === 'win32'
                ? `ping -n ${count} ${target}`
                : `ping -c ${count} ${target}`;

            const {stdout, stderr} = await execAsync(command);

            if (stderr) {
                throw new Error(stderr);
            }

            // 結果を整形して送信
            const formattedResult = formatPingResult(stdout);
            await interaction.editReply({
                content: `${target} へのping結果:\n\`\`\`${formattedResult}\`\`\``,
            });

        } catch (error: any) {
            console.error('Ping error:', error);
            await interaction.editReply(`pingの実行中にエラーが発生しました: ${error.message}`);
        }
    }
}

// ホスト名とIPアドレスの簡易バリデーション
function isValidHostname(hostname: string): boolean {
    // IPアドレス（IPv4とIPv6）のパターン
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:){0,6}:[0-9a-fA-F]{1,4}$/;

    // ドメイン名のパターン
    const hostnamePattern = /^[a-zA-Z0-9][-a-zA-Z0-9.]{0,253}[a-zA-Z0-9]$/;

    if (ipv4Pattern.test(hostname)) {
        // IPv4アドレスの各オクテットが0-255の範囲内かチェック
        const parts = hostname.split('.');
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }

    // IPv6アドレスのチェック
    if (ipv6Pattern.test(hostname)) {
        return true;
    }

    return hostnamePattern.test(hostname);
}

// ping結果の整形
function formatPingResult(output: string): string {
    // 長すぎる出力を制限（Discordのメッセージ制限に配慮）
    const maxLines = output.split('\n').slice(0, 15).join('\n');
    return maxLines.length > 1900
        ? maxLines.slice(0, 1900) + '...'
        : maxLines;
}