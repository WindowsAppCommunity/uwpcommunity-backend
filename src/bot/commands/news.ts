import { match } from '../../common/helpers/generic';
import { TextChannel, User, Message, Emoji, Client, GuildChannel } from 'discord.js';

const linkRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
const directRegex = /^ *(-direct)/

let RecentPostsStore: { user: User; lastPost: number; }[] = [];

/**
 * @summary Get a custom Discord emoji from a Client object using the name of the emoji
 * @param client Client object that has access to a users' emoji list
 * @param emojiText Name of emoji, without surrounding `:` characters
 */
function getDiscordEmoji(client: Client, emojiText: string): Emoji | null {
    emojiText = emojiText.split(":").join("");
    return client.emojis.find(emoji => emoji.name == emojiText);
}

export default (discordMessage: Message) => {
    cleanupRecentPostsStore();

    const message = discordMessage.content;
    const link = match(message, linkRegex);
    if (!link) return; // Must have a link

    // Can only post every 3 minutes
    for (let post of RecentPostsStore) {
        const UnixTimeNow = new Date().getTime();
        if (post.user.id == discordMessage.author.id && UnixTimeNow - post.lastPost < 3 * 60 * 1000) {
            discordMessage.channel.send(`<@${discordMessage.author.id}> You are doing that too much, please wait ${((3 * 60 * 1000 - (UnixTimeNow - post.lastPost)) / 60000).toFixed(2)} more minutes`);
            return;
        }
    }
    
    // Check whether the original message should be removed
    const direct = !!match(message, directRegex);

    // Get just the user comment
    const comment = message
        // Remove mentions
        .replace(/<@\d+>/g, "")
        // Remove direct command
        .replace(directRegex, "")
        // Remove the link
        .replace(linkRegex, "")
        // Remove all line breaks
        .replace(/\n/g, "")
        // Recreate server emojis
        .replace(/[^<]+[^a-z]+(?:\:(.*?)\:)/g, (toReplace: string) => {
            const emoji: Emoji | null = getDiscordEmoji(discordMessage.client, toReplace);
            if (emoji != null) return `:${emoji.id}:`;
            return "";
        })
        // Remove unsupported emojis
        .replace(/(?:<+[a-z]+\:.*?\:[^>]+>)/g, "")
        // Trim whitespace
        .trim();

    postNewsLink(discordMessage, direct, link, comment);
}

async function postNewsLink(discordMessage: Message, direct: boolean, link: string, comment: string) {
    // Get the news channel
    const channel: TextChannel = discordMessage.guild.channels.get("422031390150885388") as TextChannel;
    if (!channel) return;

    RecentPostsStore.push({ user: discordMessage.author, lastPost: new Date().getTime() });

    // Special formatting if the sender included a comment other than the link
    if (comment.length > 0) {
        await channel.send(`<@${discordMessage.author.id}> shared, and says:\n> ${comment}\n${link}`);
    } else {
        await channel.send(`<@${discordMessage.author.id}> shared:\n${link}`);
    }

    // Delete the original message if requested
    if (direct) discordMessage.delete();
}

function cleanupRecentPostsStore() {
    const UnixTimeNow = new Date().getTime();
    RecentPostsStore = RecentPostsStore.filter(data => UnixTimeNow - data.lastPost < 3 * 60 * 1000);
}
