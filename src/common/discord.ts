import * as Discord from "discord.js";

export let bot: Discord.Client;
export const uwpCommunityGuildId = "372137812037730304";

export let InitBot = function () {
    bot = new Discord.Client();
    if (!process.env.discord_botToken) {
        console.log(`\x1b[33m${`Missing "discord_botToken" environment variable. You will not be able to interact with the Discord bot without this`}\x1b[0m`);
        return;
    }

    bot.once('ready', () => {
        console.log("Server Companion bot initialized");

        InitBot = () => { }; // Prevents init from being called again
    });
    bot.login(process.env.discord_botToken);
};


export function GetGuild(): Discord.Guild | undefined {
    return bot.guilds.get(uwpCommunityGuildId);
}

export async function GetGuildUser(discordId: string): Promise<Discord.GuildMember | undefined> {
    const server = GetGuild();
    if (!server) return;

    return (await server.members.filter(member => member.id == discordId)).first();
}