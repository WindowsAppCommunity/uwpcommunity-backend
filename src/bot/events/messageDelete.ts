import { Message, TextChannel } from "discord.js";
import { GetChannelByName } from "../../common/helpers/discord";

export default async (discordMessage: Message) => {
    if (discordMessage.author?.bot)
        return; // ignore messages sent by bots.
        
    // Does not work for really old messages
    const botstuffChannel = await GetChannelByName("bot-stuff") as TextChannel;

    if ((discordMessage.channel as TextChannel).name === "mod-chat" || (discordMessage.channel as TextChannel).name === "infraction-log" || (discordMessage.channel as TextChannel).name === "bot-stuff") {
        return;
    }

    botstuffChannel.send(`Message from <@${discordMessage.author.id}> was deleted from ${(discordMessage.channel as TextChannel).name}:\n> ${discordMessage.content}`)
}
