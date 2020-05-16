import { Message, TextChannel, Guild, GuildMember } from "discord.js";
import { GetGuild } from "../../common/helpers/discord";
import { IBotCommandArgument } from "../../models/types";
import { getUserByDiscordId } from "../../models/User";

const validFindByMethod = ["discordId", "username"];

export default async (discordMessage: Message, args: IBotCommandArgument[]) => {
    const sentFromChannel = discordMessage.channel as TextChannel;

    if (args.length == 0) {
        sentFromChannel.sendMessage(`No parameters provided. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    const arg = args[0];

    if (args.length > 1) {
        sentFromChannel.sendMessage(`Too many parameters. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    if (!validFindByMethod.includes(arg.name)) {
        sentFromChannel.sendMessage(`Invalid parameter. Provide one of: \`${validFindByMethod.join(', ')}\``);
        return;
    }

    for (let method of validFindByMethod) {
        if (method != arg.name)
            continue;
        else
            handleFind(arg, discordMessage);
    }
};


function handleFind(arg: IBotCommandArgument, discordMessage: Message) {
    const server = GetGuild();
    if (!server) return;

    switch (arg.name) {
        case "discordId":
            findByDiscordId(discordMessage, server, arg.value);
            break;
        case "username":
            findByUsername(discordMessage, server, arg.value);
            break;
    }
}

function findByDiscordId(discordMessage: Message, server: Guild, discordId: string) {
    const member = server.members.find(i => i.id == discordId);
    if (!member)
        discordMessage.channel.sendMessage("Could not find a user with that ID");
    else
        sendFormattedUserInfo(discordMessage.channel as TextChannel, member);
}

function findByUsername(discordMessage: Message, server: Guild, username: string) {
    const member = server.members.find(i => `${i.user.username}#${i.user.discriminator}` == username);
    if (!member)
        discordMessage.channel.sendMessage("Could not find a user with that ID");
    else
        sendFormattedUserInfo(discordMessage.channel as TextChannel, member);
}

async function sendFormattedUserInfo(channel: TextChannel, member: GuildMember) {
    let formattedUserInfo =
        `Discord Id: \`${member.id}\`
Current username: \`${member.user.username}#${member.user.discriminator}\`
Nickname: \`${member.nickname}\`
Joined: \`${member.joinedAt.toUTCString()}\``;

    const userData = await getUserByDiscordId(member.id);
    if (userData) {
        formattedUserInfo += `
Registered name: \`${userData.name}\`
Registered Email: \`${userData.email}\``;
    }

    channel.sendMessage(formattedUserInfo);
}