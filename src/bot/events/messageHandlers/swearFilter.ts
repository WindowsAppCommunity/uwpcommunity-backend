import { Message, TextChannel, DMChannel, PartialMessage } from "discord.js";
import { GetGuild } from "../../../common/helpers/discord";

export const swearRegex: RegExp = new RegExp(/fuck|\sass\s|dick|shit|pussy|cunt|whore|bastard|bitch|faggot|penis|slut|retarded/);

export const whitelist: RegExp = new RegExp(/ishittest/);

export async function handleSwearFilter(discordMessage: PartialMessage | Message) {
    const message = discordMessage.content?.toLowerCase() ?? ""; // A partial update might be just adding an embed, so no need to check content again
    const checks = [message];
    discordMessage.embeds.forEach(e => checks.push(e.title?.toLowerCase() ?? "", e.description?.toLowerCase() ?? "", e.author?.name?.toLowerCase() ?? ""));
    let isEmbed = false; // We will show a different message if the swear is in the embed part

    for (const check of checks) {
        if (check.match(swearRegex) && !check.match(whitelist)) {
            const sentFromChannel = discordMessage.channel as TextChannel;
            if (!discordMessage.guild?.roles.everyone)
                return;

            const channelPermsForAll = sentFromChannel.permissionsFor(discordMessage.guild.roles.everyone);

            // If the channel is private, don't filter
            if (channelPermsForAll && !channelPermsForAll.has("VIEW_CHANNEL")) {
                return;
            }

            await discordMessage.fetch(); // Partial messages need to be resolved at this point. Does nothing if not partial
            if (!discordMessage.partial) { // This allows us to access properties that could have been null before fetching
                const dm: DMChannel = await discordMessage.author.createDM();
                await dm.send(`Your message was removed because it contained a swear word${isEmbed ? " in an embed" : ""}.
> ${discordMessage.content}`);

                const guild = await GetGuild();
                const author = discordMessage.author;
                if (guild) {
                    const botChannel = guild.channels.cache.find(i => i.name == "bot-stuff") as TextChannel;
                    botChannel.send(`A swear word from \`${author.username}#${author.discriminator}\` (ID ${author.id}) sent in <#${sentFromChannel.id}> was removed:
> ${discordMessage.content}${isEmbed ? "\n\nOffending part of embed:\n> " + check : ""}`);
                }
            }

            await discordMessage.delete();

            break;
        }

        isEmbed = true; // First iteration will always be message content, even if empty
    }
}
