import * as Discord from "discord.js";
import fetch from "node-fetch";
import { IDiscordUser } from "../../models/types";
import { Response } from "express";
import { genericServerError } from "./generic";
import { BuildResponse, HttpStatus } from "./responseHelper";

export let bot: Discord.Client;
export const uwpCommunityGuildId: string = process.env.guildId || "667491687639023636";

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

export function GetUser(discordId: string) {
    return bot.fetchUser(discordId)
}

export async function GetGuildRoles() {
    const server = GetGuild();
    if (!server) return;

    return server.roles.array();
}

export function GetChannelByName(channelName: string): Discord.GuildChannel | null {
    const server = GetGuild();
    if (!server) return null;

    let requestedChannel = server.channels.find(i => i.name == channelName);
    if (!requestedChannel) {
        requestedChannel = server.channels.find(i => i.name == "mod-chat");
        (requestedChannel as Discord.TextChannel).sendMessage(`Bot tried to find channel ${channelName} but failed.`);
    }

    return requestedChannel;
}

export async function EditMultiMessages(content: string, ...params: Discord.Message[]): Promise<void> {
    for (const message of params) {
        await message.edit(content);
    }
}

export async function SendMultiMessages(content: string, ...params: (Discord.GuildChannel | Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel)[]): Promise<Discord.Message[]> {
    const results : Discord.Message[] = [];
    
    for (const channel of params) {
        if (channel.type === "text") {
            const sentMessage = await (channel as Discord.TextChannel).send(content);
            results.push(sentMessage as Discord.Message);
        }
    }

    return results;
}

export async function GetDiscordUser(accessToken: string): Promise<IDiscordUser | undefined> {
    const Req = await fetch("https://discordapp.com/api/v6/users/@me", {
        headers: {
            "Authorization": "Bearer " + accessToken
        }
    });
    if (!Req || Req.status != 200) return;
    return await Req.json();
}

export async function GetDiscordIdFromToken(accessToken: string, res: Response, emitResponseOnFailure?: boolean): Promise<string | undefined> {
    const user = await GetDiscordUser(accessToken).catch((err) => genericServerError(err, res));
    if (!user) {
        if (emitResponseOnFailure !== false) BuildResponse(res, HttpStatus.Unauthorized, "Invalid accessToken");
        return;
    }
    return (user as IDiscordUser).id;
}