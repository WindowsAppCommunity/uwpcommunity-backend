import { Message, TextChannel, DMChannel } from "discord.js";
import { GetGuild } from "../../../common/helpers/discord";

const swearRegex: RegExp = new RegExp(/fuck|\sass\s|dick|shit|pussy|cunt|whore|bastard|bitch|faggot|penis|slut/);

export async function handleSwearFilter(discordMessage: Message) {
    const message = discordMessage.content.toLowerCase();

    if (message.match(swearRegex)) {
        const sentFromChannel = discordMessage.channel as TextChannel;
        const channelPermsForAll = sentFromChannel.permissionsFor(discordMessage.guild.defaultRole);


        // If the channel is private, don't filter
        if (channelPermsForAll && !channelPermsForAll.hasPermission("VIEW_CHANNEL")) {
            return;
        }

        const dm: DMChannel = await discordMessage.author.createDM();
        await dm.sendMessage(`Your message was removed because it contained a swear word.
> ${discordMessage.content}`);

        const guild = GetGuild();
        const author = discordMessage.author;
        if (guild) {
            const botChannel = guild.channels.find(i => i.name == "bot-stuff") as TextChannel;
            botChannel.sendMessage(`A swear word from \`${author.username}#${author.discriminator}\` (ID ${author.id}) sent in <#${sentFromChannel.id}> was removed:
> ${message}`);
        }

        await discordMessage.delete();
    }
}