import { Message, TextChannel } from "discord.js";
import { GetChannelByName } from "../../common/helpers/discord";

export default async (discordMessage: Message) => {
    // Does not work for really old messages
    const botstuffChannel = await GetChannelByName("bot-stuff") as TextChannel;

    botstuffChannel.send(`Message from <@${discordMessage.author.id}> was deleted from ${(discordMessage.channel as TextChannel).name}:\n> ${discordMessage.content}`)
}