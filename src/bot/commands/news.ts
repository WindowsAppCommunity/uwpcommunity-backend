import { match } from '../../common/helpers/generic';
import { TextChannel, User, Message, Emoji, Client } from 'discord.js';
import { IBotCommandArgument } from '../../models/types';
import { GetChannelByName } from '../../common/helpers/discord';

const linkRegex = /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

let RecentPostsStore: { user: User; lastPost: number; }[] = [];

/**
 * @summary Get a custom Discord emoji from a Client object using the name of the emoji
 * @param client Client object that has access to a users' emoji list
 * @param emojiText Name of emoji, without surrounding `:` characters
 */
function getDiscordEmoji(client: Client, emojiText: string): Emoji | undefined {
    emojiText = emojiText.split(":").join("");
    return client.emojis.cache.find(emoji => emoji.name == emojiText);
}

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    cleanupRecentPostsStore();

    const link = match(commandParts[0], linkRegex);
    if (!link) return; // Must have a link

    // Can only post every 3 minutes
    for (let post of RecentPostsStore) {
        const UnixTimeNow = new Date().getTime();
        if (post.user.id == discordMessage.author.id && UnixTimeNow - post.lastPost < 3 * 60 * 1000) {
            discordMessage.channel.send(`<@${discordMessage.author.id}> You are doing that too much, please wait ${((3 * 60 * 1000 - (UnixTimeNow - post.lastPost)) / 60000).toFixed(2)} more minutes`);
            return;
        }
    }

    const commentArgs = args.find(arg => arg.name == "comment");

    // Get just the user comment
    const comment = commentArgs?.value
        // Remove mentions
        .replace(/<@\d+>/g, "")
        // Remove the link
        .replace(linkRegex, "")
        // Remove all line breaks
        .replace(/\n/g, "")
        // Recreate server emojis
        .replace(/[^<]+[^a-z]+(?:\:(.*?)\:)/g, (toReplace: string) => {
            const emoji: Emoji | undefined = getDiscordEmoji(discordMessage.client, toReplace);
            if (emoji != undefined) return `:${emoji.id}:`;
            return "";
        })
        // Remove unsupported emojis
        .replace(/(?:<+[a-z]+\:.*?\:[^>]+>)/g, "")
        // Trim whitespace
        .trim();

    postNewsLink(discordMessage, link, comment);
}

async function postNewsLink(discordMessage: Message, link: string, comment?: string) {
    // Get the news channel
    const channel: TextChannel = await GetChannelByName("news") as TextChannel;
    if (!channel) return;

    RecentPostsStore.push({ user: discordMessage.author, lastPost: new Date().getTime() });

    // Special formatting if the sender included a comment other than the link
    if (comment && comment.length > 0) {
        await channel.send(`<@${discordMessage.author.id}> shared, and says:\n> ${comment}\n${link}`);
    } else {
        await channel.send(`<@${discordMessage.author.id}> shared:\n${link}`);
    }

}

function cleanupRecentPostsStore() {
    const UnixTimeNow = new Date().getTime();
    RecentPostsStore = RecentPostsStore.filter(data => UnixTimeNow - data.lastPost < 3 * 60 * 1000);
}
