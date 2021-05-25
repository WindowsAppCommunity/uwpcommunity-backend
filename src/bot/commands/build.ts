import { Message, VoiceChannel } from "discord.js";
import { GetGuild } from "../../common/helpers/discord";
import { IBotCommandArgument } from "../../models/types";
import { swearRegex } from "../events/messageHandlers/swearFilter";

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    if (!discordMessage.member)
        return;

    const server = await GetGuild();
    if (!server) return;

    if (!discordMessage.member)
        return;

    const isDev = discordMessage.member?.roles?.cache.find(i => i.name.toLowerCase() == "developer") != undefined;

    const buildChannelCount = server.channels.cache.filter(i => i.name.startsWith("build-") && i.type == "voice").array.length;

    if (buildChannelCount > 9) {
        discordMessage.channel.send(`Limit reached for user generated channels`);
        return;
    }

    if (!isDev) {
        discordMessage.channel.send(`<@${discordMessage.member.id}>, you aren't registered as a developer. See <#535460764614656010> for info on how to register.`);
        return;
    }

    const sessionNameArg = args.find(i => i.name == "sessionName");
    if (!sessionNameArg) {
        discordMessage.channel.send(`<@${discordMessage.member.id}>, you need to supply a channel name with the \`sessionName\` argument`);
        return;
    }

    if (sessionNameArg.value.match(swearRegex)) {
        return;
    }

    const existingChannel = await server.channels.cache.find(i => i.name == "build-" + sessionNameArg.value);
    const newChannel = existingChannel || await server.channels.create("build-" + sessionNameArg.value, { type: "voice" });

    let category = server.channels.cache.find(c => c.name == "🛠   Build" && c.type == "category");
    if (!category) {
        discordMessage.channel.send(`Error: Build category not found.`);
        return;
    }

    newChannel.setParent(category.id);


    if (!existingChannel) {
        let channelOccupiedChecker = setInterval(() => {
            const channelMemberCount = (newChannel as VoiceChannel).members.array().length;

            if (channelMemberCount == 0) {
                newChannel.delete();
                clearInterval(channelOccupiedChecker);
            }
        }, 5 * 60 * 1000);
    }


    discordMessage.member.voice.setChannel(newChannel).catch(() => { });

    if (existingChannel) {
        discordMessage.channel.send(`<@${discordMessage.author.id}> this channel already exists.`);
    } else
        discordMessage.channel.send("Channel created. It will be automatically deleted when no one is using it for 5 minutes.")
};
