import { Message, TextChannel } from "discord.js";
import fetch from "node-fetch";
import { bot, GetChannelByName } from "../../../common/helpers/discord";

const disallowedDomainsForApiLookup = ["docs.microsoft.com", "devblogs.microsoft.com", "social.msdn.microsoft.com", "stackoverflow.com"];

function hasDisallowedDomain(text: string): boolean {
    for (let domain of disallowedDomainsForApiLookup) {
        if (text.includes(`href="https://${domain}`))
            return true;
    }

    return false;
}

export async function devChatterWarning(discordMessage: Message) {
    var generalChannel = await GetChannelByName("user-chat") as TextChannel;

    if (!generalChannel || discordMessage.channel.id != generalChannel.id)
        return;

    if (hasDisallowedDomain(discordMessage.content)) {
        await displayWarning(discordMessage);
        return;
    }

    // Allow links regardless of possible dev talk.
    if (discordMessage.content.includes("http"))
        return;
        
    let codeBlockMatch: string[] = discordMessage.content.match(/```[\s\S]+?```/g)?.map(x => x) ?? [];
    let interfaceNameMatch: string[] = discordMessage.content.match(/[^:]I[A-Z][a-z]{3,}/g)?.map(x => x) ?? [];
    let pascalOrCamelCaseOrCppNamespaceMatch: string[] = discordMessage.content.match(/[^:](?:[A-Z][a-z]{2,}:?:?){3,}/g)?.map(x => x) ?? [];
    let snakeCaseMatch: string[] = discordMessage.content.match(/[A-Za-z]{2,}_[A-Za-z]{2,}/g)?.map(x => x) ?? [];
    let kebabCaseMatch: string[] = discordMessage.content.match(/[A-Za-z]{2,}-[A-Za-z]{2,}/g)?.map(x => x) ?? [];

    var allMatches = codeBlockMatch.concat(interfaceNameMatch).concat(pascalOrCamelCaseOrCppNamespaceMatch).concat(snakeCaseMatch).concat(kebabCaseMatch);

    for (let match of allMatches) {
        var searchQuery = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(match)}`, {
            headers: {
                "User-Agent": "Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/4.0)"
            }
        });

        var response = await searchQuery.text();

        if (hasDisallowedDomain(response)) {
            await displayWarning(discordMessage);
            return;
        }
    }
}

async function displayWarning(discordMessage: Message) {
    var msg = await discordMessage.reply(`To make sure everyone feels welcome to take part in the server, <#372137812037730306> is for non-technical chat only.\nTechnical discussions should take place in <#663434534087426129>, <#677261195321016371> or another appropriate channel.\n\nFor your convenience, use the \`!portal #channelname\` command to seamlessly switch to another channel.`);

    bot.on("messageDelete", async deletedMsg => {
        if (deletedMsg.id == discordMessage.id)
            await msg.delete();
    });
}

function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}