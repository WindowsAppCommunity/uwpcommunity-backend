import { IBotCommandArgument } from "../../models/types.js";
import { Message, TextChannel, Embed, EmbedBuilder } from "discord.js";

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
    var channelMentions = [...message.mentions.channels.values()];
    if (channelMentions.length > 1) {
        (message.channel as TextChannel).send("I can only create a portal to one channel at a time");
        return;
    }

    if (channelMentions.length == 0) {
        (message.channel as TextChannel).send("Where to? Try again with a channel mention!");
        return;
    }

    var channel = channelMentions[0];
    if (!channel)
        return;

    if (channel.id == message.channel.id) {
        (message.channel as TextChannel).send("You're already in that channel!");
        return;
    }

    if (!(channel as TextChannel).permissionsFor(message.author.id)?.has(["SendMessages"]) ||
        !(channel as TextChannel).permissionsFor(message.author.id)?.has(["ViewChannel"])) {
        (message.channel as TextChannel).send(`You aren't allowed to open a portal there`);
        return;
    }

    var portalImage = portalImages[Math.floor(Math.random() * portalImages.length)];

    var inMessage = await (message.channel as TextChannel).send({ embeds: [createInitialInEmbed(channel as TextChannel, portalImage.in).data] });
    var outMessage = await (channel as TextChannel).send({ embeds: [createOutputEmbed(message.author.id, message.channel as TextChannel, portalImage.out, inMessage.url).data] });

    await inMessage.edit({embeds: [createFinalInEmbed(channel as TextChannel, portalImage.in, outMessage.url).data]});
}

function createInitialInEmbed(channel: TextChannel, img: string): EmbedBuilder {
    return new EmbedBuilder()
        .setThumbnail(img)
        .setDescription(`Spawning a portal to <#${channel.id}>...`);
}

function createOutputEmbed(userId: string, channel: TextChannel, img: string, msgLink: string): EmbedBuilder {
    return new EmbedBuilder()
        .setThumbnail(img)
        .setDescription(`<@${userId}> opened a portal from <#${channel.id}>!\n[Go back through the portal](${msgLink})`);
}

function createFinalInEmbed(channel: TextChannel, img: string, msgLink: string): EmbedBuilder {
    return new EmbedBuilder()
        .setThumbnail(img)
        .setDescription(`A portal to <#${channel.id}> was opened!\n[Enter the portal](${msgLink})`);
}