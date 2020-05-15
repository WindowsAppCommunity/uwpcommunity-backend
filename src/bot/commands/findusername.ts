import { Message, TextChannel } from "discord.js";
import { GetGuild } from "../../common/helpers/discord";
import { IBotCommandArgument } from "../../models/types";

const validFindByMethod = ["discordId"];

export default async (discordMessage: Message, args: IBotCommandArgument[]) => {
    const sentFromChannel = discordMessage.channel as TextChannel;

    if (args.length == 0) {
        sentFromChannel.sendMessage(`You need to provide a parameter. Options are: \`${validFindByMethod.join(', ')}\``);
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
            const member = server.members.find(i => i.id == arg.value);
            if (!member)
                discordMessage.channel.sendMessage("Could not find a user with that ID");
            else
                discordMessage.channel.sendMessage(`Discord Id: \`${arg.value}\`\nCurrent username: \`${member.user.username}#${member.user.discriminator}\``);
            break;
    }
}