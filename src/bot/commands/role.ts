import { Message } from "discord.js";
import { GetGuild, GetRoles } from "../../common/helpers/discord";
import { capitalizeFirstLetter } from "../../common/helpers/generic";
import { IBotCommandArgument } from "../../models/types";

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    const command = commandParts[0].toLowerCase();

    switch (command) {
        case "find":
            findRole(discordMessage, commandParts, args);
            break;
    }
};

async function findRole(discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) {
    switch (commandParts[1].toLowerCase()) {
        case "empty":
            findEmptyRoles(discordMessage);
            break;
        default:
            fromSpecificRole(commandParts[1].toLowerCase(), discordMessage);
    }
}

async function fromSpecificRole(roleName: string, discordMessage: Message) {
    const roles = await GetRoles();
    if (!roles)
        return;

    const role = roles.find(i => i.name.toLowerCase() == roleName);

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

}

async function findEmptyRoles(discordMessage: Message) {
    const roles = await GetRoles();
    if (!roles)
        return;

    const emptyRoles = roles.filter(x => x.members.size == 0);

    let message = `Total empty roles: ${emptyRoles.length}`;

    if(emptyRoles.length > 0)
        message += "\n";

    for (const role of emptyRoles) {
        message += `\n${role.name}`
    }

    await discordMessage.channel.send(message);    
}