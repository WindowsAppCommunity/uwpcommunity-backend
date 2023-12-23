import { Message, TextChannel, DMChannel, PartialMessage, MessageFlags } from "discord.js";
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
            if (channelPermsForAll && !channelPermsForAll.has(["ViewChannel"])) {
                return;
            }

            await discordMessage.fetch(); // Partial messages need to be resolved at this point. Does nothing if not partial
            if (!discordMessage.partial) { // This allows us to access properties that could have been null before fetching
                try {
                    // If the user has turned off DMs from all server members, this will throw
                    const dm: DMChannel = await discordMessage.author.createDM();
                    await dm.send(`Your message was removed because it contained a swear word${isEmbed ? " in an embed" : ""}.\n>>> ${discordMessage.content}`);
                } catch {
                    var tick = 5;
                    var baseMsg = `<@${discordMessage.author.id}> Swear word was removed, see rule 4.\nThis message will self destruct in `;
                    var sentMsg = await (discordMessage.channel as TextChannel).send(baseMsg + tick);

                    var interval = setInterval(() => {
                        tick--;

                        if (tick == 0) {
                            sentMsg.delete();
                            clearInterval(interval);
                            return;
                        }

                        sentMsg.edit(baseMsg + tick);
                    }, 1000);
                }

                const guild = await GetGuild();
                const author = discordMessage.author;
                if (guild) {
                    const botChannel = guild.channels.cache.find(i => i.name == "bot-stuff") as TextChannel;
                    botChannel.send({
                        content: `A swear word ${isEmbed ? "in an embed " : ""}from <@${author.id}> sent in <#${sentFromChannel.id}> was removed:\n>>> ${check}`,
                        allowedMentions: {
                            parse: []
                        },
                        flags: MessageFlags.SuppressEmbeds
                    });
                }
            }

            await discordMessage.delete();

            break;
        }

        isEmbed = true; // First iteration will always be message content, even if empty
    }
}
