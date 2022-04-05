import { IBotCommandArgument } from "../../models/types";
import { Message, MessageEmbed, TextChannel } from "discord.js";

interface portalImage {
    in: string;
    out: string;
}

var portalImages: portalImage[] = [
    {
        out: "https://cdn.discordapp.com/attachments/642818541426573344/960339465891631186/b.png",
        in: "https://cdn.discordapp.com/attachments/642818541426573344/960339466185224212/o.png",
    },
]


export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    var channelMentions = message.mentions.channels.array();
    if (channelMentions.length > 1) {
        message.channel.send("I can only create a portal to one channel at a time");
        return;
    }

    if (channelMentions.length == 0) {
        message.channel.send("Where to? Try again with a channel mention!");
        return;
    }

    var channel = channelMentions[0];
    if (!channel)
        return;

    if (channel.id == message.channel.id) {
        message.channel.send("You're already in that channel!");
        return;
    }

    if (!channel.permissionsFor(message.author.id)?.has("SEND_MESSAGES") ||
        !channel.permissionsFor(message.author.id)?.has("VIEW_CHANNEL")) {
        message.channel.send(`You aren't allowed to open a portal there`);
        return;
    }

    var portalImage = portalImages[Math.floor(Math.random() * portalImages.length)];

    var inMessage = await message.channel.send(createInitialInEmbed(channel, portalImage.in));
    var outMessage = await channel.send(createOutputEmbed(message.author.id, message.channel as TextChannel, portalImage.out, inMessage.url));

    await inMessage.edit(createFinalInEmbed(channel, portalImage.in, outMessage.url));
}

function createInitialInEmbed(channel: TextChannel, img: string): MessageEmbed {
    return new MessageEmbed()
        .setThumbnail(img)
        .setDescription(`Spawning a portal to <#${channel.id}>...`);
}

function createOutputEmbed(userId: string, channel: TextChannel, img: string, msgLink: string): MessageEmbed {
    return new MessageEmbed()
        .setThumbnail(img)
        .setDescription(`<@${userId}> opened a portal from <#${channel.id}>!\n[Go back through the portal](${msgLink})`);
}

function createFinalInEmbed(channel: TextChannel, img: string, msgLink: string): MessageEmbed {
    return new MessageEmbed()
        .setThumbnail(img)
        .setDescription(`A portal to <#${channel.id}> was opened!\n[Enter the portal](${msgLink})`);
}