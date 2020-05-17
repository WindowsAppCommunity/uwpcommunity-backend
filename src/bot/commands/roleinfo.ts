import { Message } from "discord.js";
import { GetGuild } from "../../common/helpers/discord";
import { capitalizeFirstLetter } from "../../common/helpers/generic";

export default async (discordMessage: Message, args: string[]) => {
    const message = discordMessage.content.toLowerCase();

    const server = GetGuild();
    if (!server) return;

    const roles = server.roles.array();
    const role = roles.find(i => i.name.toLowerCase() == message);

    if (!role) {
        discordMessage.channel.sendMessage(`Role not found`);
        return;
    }

    const numberOfMembers = role.members.size;
    const dateRoleCreated = role.createdAt.toUTCString();
    const mentionable = role.mentionable;

    await discordMessage.channel.sendMessage(
        `__**${capitalizeFirstLetter(discordMessage.content)}\ role info**__:
Member count: ${numberOfMembers}
Date created: ${dateRoleCreated}
Mentionable: ${mentionable}`);

};