import { Message, TextChannel, Guild, GuildMember } from "discord.js";
import { GetGuild, GetGuildMembers } from "../../common/helpers/discord";
import { IBotCommandArgument } from "../../models/types";
import { getUserByDiscordId } from "../../models/User";

const validFindByMethod = ["discordId", "username"];

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    const sentFromChannel = discordMessage.channel as TextChannel;

    if (args.length == 0) {
        sentFromChannel.send(`No parameters provided. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    const arg = args[0];

    if (args.length > 1) {
        sentFromChannel.send(`Too many parameters. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    if (!validFindByMethod.includes(arg.name)) {
        sentFromChannel.send(`Invalid parameter. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    for (let method of validFindByMethod) {
        if (method != arg.name)
            continue;
        else
            await handleFind(arg, discordMessage);
    }
};


async function handleFind(arg: IBotCommandArgument, discordMessage: Message) {
    const server = await GetGuild();
    if (!server) return;

    switch (arg.name) {
        case "discordId":
            await findByDiscordId(discordMessage, server, arg.value);
            break;
        case "username":
            await findByUsername(discordMessage, server, arg.value);
            break;
    }
}

async function findByDiscordId(discordMessage: Message, server: Guild, discordId: string) {
    const members = await GetGuildMembers();
    if (!members) {
        discordMessage.channel.send("error: couldn't get members list");
        return;
    }

    const member = members.find(i => i.id == discordId);
    if (!member)
        discordMessage.channel.send("Could not find a user with that ID");
    else
        sendFormattedUserInfo(discordMessage.channel as TextChannel, member);
}

async function findByUsername(discordMessage: Message, server: Guild, username: string) {
    const members = await GetGuildMembers();
    if (!members) {
        discordMessage.channel.send("error: couldn't get members list");
        return;
    }

    const member = members.find(i => `${i.user.username}#${i.user.discriminator}` == username);
    if (!member)
        discordMessage.channel.send("Could not find a user with that ID");
    else
        sendFormattedUserInfo(discordMessage.channel as TextChannel, member);
}

export async function sendFormattedUserInfo(channel: TextChannel, member: GuildMember) {
    let formattedUserInfo =
        `Discord Id: \`${member.id}\`
Current username: \`${member.user.username}#${member.user.discriminator}\`
Nickname: \`${member.nickname}\`
Joined: \`${member.joinedAt?.toUTCString()}\``;

    const userData = await getUserByDiscordId(member.id);
    if (userData) {
        formattedUserInfo += `
Registered name: \`${userData.name}\`
Registered Email: \`${userData.email}\``;
    }

    channel.send(formattedUserInfo);
}