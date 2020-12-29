import { Message, TextChannel, DMChannel } from "discord.js";
import { GetGuild } from "../../../common/helpers/discord";

export const swearRegex: RegExp = new RegExp(/fuck|\sass\s|dick|shit|pussy|cunt|whore|bastard|bitch|faggot|penis|slut|retarded/);

export const whitelist: RegExp = new RegExp(/ishittest/);

export async function handleSwearFilter(discordMessage: Message) {
    const message = discordMessage.content.toLowerCase();

    if (message.match(swearRegex) && !message.match(whitelist)) {
        const sentFromChannel = discordMessage.channel as TextChannel;
        if (!discordMessage.guild?.roles.everyone)
            return;

        const channelPermsForAll = sentFromChannel.permissionsFor(discordMessage.guild.roles.everyone);

        // If the channel is private, don't filter
        if (channelPermsForAll && !channelPermsForAll.has("VIEW_CHANNEL")) {
            return;
        }

        const dm: DMChannel = await discordMessage.author.createDM();
        await dm.send(`Your message was removed because it contained a swear word.
> ${discordMessage.content}`);

        const guild = await GetGuild();
        const author = discordMessage.author;
        if (guild) {
            const botChannel = guild.channels.cache.find(i => i.name == "bot-stuff") as TextChannel;
            botChannel.send(`A swear word from \`${author.username}#${author.discriminator}\` (ID ${author.id}) sent in <#${sentFromChannel.id}> was removed:
> ${message}`);
        }

        await discordMessage.delete();
    }
}