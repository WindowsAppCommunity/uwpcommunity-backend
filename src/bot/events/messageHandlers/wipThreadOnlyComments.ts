import { Message } from "discord.js";
import { match } from '../../../common/helpers/generic';
import { GetChannelByName } from "../../../common/helpers/discord";

const linkRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

export async function wipThreadOnlyComments(discordMessage: Message) {
    const wipChannel = await GetChannelByName("work-in-progress");

    // work-in-progress channel wasn't found
    if (!wipChannel)
        return;

    // Message wasn't sent to work-in-progress channel.
    if (wipChannel.id != discordMessage.channel.id)
        return;

    // If message doesn't contain links or media
    if(!MessageContainsLinks(discordMessage) && !MessageContainsMedia(discordMessage)) {
        await discordMessage.delete();
        
        var dm = await discordMessage.author.createDM();
        await dm.send(`Posts in <#${wipChannel.id}> must contain media. If you're trying to comment on a post, start or join a thread.`);
    }
}

function MessageContainsLinks(discordMessage: Message): boolean {
    return match(discordMessage.content, linkRegex) != undefined;
}

function MessageContainsMedia(discordMessage: Message): boolean {
    return discordMessage.attachments.size > 0;
}