import { Message, TextChannel, GuildMember, ChannelType } from "discord.js";
import { GetChannelByName, GetGuildChannels } from "../../../common/discord.js";

/**
 * @summary Handles cases where users join the server, send a spam link, and never engage with the server.
 * @param discordMessage Message sent in discord
 */
export async function handlePossibleBan(discordMessage: Message) {
    if (!discordMessage.member)
        return;

    const limitReached = await userMessageCounter(discordMessage.member, 10);

    if (limitReached) {
        const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
        if (!botChannel)
            return;

        botChannel.send(`<@${discordMessage.author.id}> has triggered our spam detection system, and has been automatically banned from the UWP Community Discord server. \n> ${discordMessage.content}`)

        // TODO: Test first
        // discordMessage.author.send("You have triggered our spam detection system, and have been banned from the UWP Community Discord server. ");
        // discordMessage.guild?.members.ban(discordMessage.author);
    }
}

// Check for a minimum time between next and last, and reset the limit counter when we don't find that. Only go X number of messages back. 
async function userMessageCounter(member: GuildMember, limit: number) {

    // Store outside of channel scope to allow for comparison between channels for this user.
    let lastMessage;
    let potentialSpamCount = 0;
    let channelsAffected = new Map<string, TextChannel>();
    let messages = new Map<string, Message>();

    const channels = await GetGuildChannels();
    if (!channels)
        return false;

    for (let channel of channels) {
        if (channel.type != ChannelType.GuildText)
            continue;

        const textChannel = channel as TextChannel;

        if (!member.permissionsIn(textChannel).toArray().includes("SendMessages"))
            continue;

        if (!member.permissionsIn(textChannel).toArray().includes("ViewChannel"))
            continue;

        const fetchedMessages = await textChannel.messages.fetch({ limit: 5 });

        for (let message of fetchedMessages.values()) {
            if (!member.joinedAt || message.author.id == member.id)
                continue;

            // If we reach a message older than when the member joined.
            if (message.createdAt < member.joinedAt)
                return { shouldBan: potentialSpamCount > limit, messageCount: potentialSpamCount, channelsAffected, messages };

            // messages were sent in quick succession
            const QUICK_SUCCESSION_THRESHOLD = new Date(Date.now() - 5000); // 5 seconds ago
            if (lastMessage && new Date(lastMessage.createdAt.getTime() - QUICK_SUCCESSION_THRESHOLD.getTime()) > message.createdAt) {
                potentialSpamCount++;

                messages.set(message.id, message);
                channelsAffected.set(textChannel.id, textChannel);

                // If they reach the limit.
                if (potentialSpamCount > limit)
                    return { shouldBan: true, messageCount: potentialSpamCount, channelsAffected, messages };

                continue;
            } else {
                messages.clear();
                channelsAffected.clear();
            }

            lastMessage = message;
        }
    }

    return { shouldBan: false, messageCount: potentialSpamCount, channelsAffected, messages };
}
