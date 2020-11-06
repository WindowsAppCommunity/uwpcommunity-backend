import { Message, TextChannel, GuildMember } from "discord.js";
import { GetChannelByName, GetGuildChannels } from "../../../common/helpers/discord";

const bannableMessageKeywords = ["bit.ly", "grades", "essay"];

/**
 * @summary Handles cases where users join the server, send a spam link, and never engage with the server.
 * @param discordMessage Message sent in discord
 */
export async function handlePossibleBan(discordMessage: Message) {
    for (let keyword of bannableMessageKeywords)
        if (!discordMessage.content.includes(keyword))
            return;

    if (!discordMessage.member)
        return;

    const limitReached = await userMessageCounter(discordMessage.member, 4);

    if (limitReached) {
        const botchannel = await GetChannelByName("bot-stuff") as TextChannel;
        if (!botchannel) return;

        botchannel.send(`${discordMessage.author.username}#${discordMessage.author.discriminator} (Discord ID ${discordMessage.author.id}) has triggered our spam detection system, and has been automatically banned from the UWP Community Discord server. \n> ${discordMessage.content}`)

        discordMessage.author.send("You have triggered our spam detection system, and have been automatically banned from the UWP Community Discord server. ");

        discordMessage.guild?.members.ban(discordMessage.author);
    }
}

async function userMessageCounter(member: GuildMember, limit: number): Promise<boolean> {
    let messageCount = 0;

    const channels = await GetGuildChannels();
    if (!channels)
        return false;

    var lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    for (let channel of channels) {
        if (channel.type == "text") {
            const textChannel = channel as TextChannel;

            if (member.permissionsIn(textChannel).has("SEND_MESSAGES"))
                continue;

            const messages = textChannel.messages.cache.array();
            for (let message of messages) {
                if (message.author.id == member.id)
                    messageCount++;

                if (!member.joinedAt)
                    continue;

                if (message.createdAt < member.joinedAt)
                    return messageCount > limit;

                if (message.createdAt < lastYear)
                    return messageCount > limit;

                if (messageCount > limit)
                    return true;
            }
        }
    }

    return false;
}
