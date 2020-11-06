import { Message } from "discord.js";
import { GetGuild, GetRoles } from "../../common/helpers/discord";
import { capitalizeFirstLetter } from "../../common/helpers/generic";
import { IBotCommandArgument } from "../../models/types";

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    const message = commandParts[0].toLowerCase();

    const roles = await GetRoles();
    if (!roles)
        return;

    const role = roles.find(i => i.name.toLowerCase() == message);

    if (!role) {
        discordMessage.channel.send(`Role not found`);
        return;
    }

    const numberOfMembers = role.members.size;
    const dateRoleCreated = role.createdAt.toUTCString();
    const mentionable = role.mentionable;

    await discordMessage.channel.send(
        `__**${capitalizeFirstLetter(discordMessage.content)}\ role info**__:
Member count: ${numberOfMembers}
Date created: ${dateRoleCreated}
Mentionable: ${mentionable}`);

};