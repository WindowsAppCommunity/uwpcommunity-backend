import { Message, VoiceChannel } from "discord.js";
import { GetGuild } from "../../common/helpers/discord";
import { IBotCommandArgument } from "../../models/types";
import { swearRegex } from "../events/messageHandlers/swearFilter";

export default async (discordMessage: Message, args: IBotCommandArgument[]) => {
    const message = discordMessage.content.toLowerCase();

    if (message.match(swearRegex))
        return;

    const server = GetGuild();
    if (!server) return;

    const roles = server.roles.array();
    const isDev = discordMessage.member.roles.find(i => i.name.toLowerCase() == "developer") != undefined;


    const buildChannelCount = server.channels.array().filter(i => i.name.startsWith("build-") && i.type == "voice").length;

    if (buildChannelCount > 9) {
        discordMessage.channel.send(`Limit reached for user generated channels`);
        return;
    }

    if (!isDev) {
        discordMessage.channel.sendMessage(`<@${discordMessage.member.id}>, you aren't registered as a developer. See <#535460764614656010> for info on how to register.`);
        return;
    }

    const sessionNameArg = args.find(i => i.name == "sessionName");
    if (!sessionNameArg) {
        discordMessage.channel.send(`<@${discordMessage.member.id}>, you need to supply a channel name with the \`sessionName\` argument`);
        return;
    }

    const existingChannel = await server.channels.find(i => i.name == "build-" + sessionNameArg.value);
    const newChannel = existingChannel || await server.createChannel("build-" + sessionNameArg.value, { type: "voice" });

    let category = server.channels.find(c => c.name == "🛠   Build" && c.type == "category");
    newChannel.setParent(category);


    if (!existingChannel) {
        let channelOccupiedChecker = setInterval(() => {
            const channelMemberCount = (newChannel as VoiceChannel).members.array().length;

            if (channelMemberCount == 0) {
                newChannel.delete();
                clearInterval(channelOccupiedChecker);
            }
        }, 5 * 60 * 1000);
    }


    discordMessage.member.setVoiceChannel(newChannel).catch(() => { });

    if (existingChannel) {
        discordMessage.channel.send(`<@${discordMessage.author.id}> this channel already exists.`);
    } else
        discordMessage.channel.send("Channel created. It will be automatically deleted when no one is using it for 5 minutes.")
};
