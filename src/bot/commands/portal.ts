import { IBotCommandArgument } from "../../models/types";
import { Message, MessageEmbed, TextChannel } from "discord.js";

interface portalImage {
    in: string;
    out: string;
}

var portalImages: portalImage[] = [
    {
        out: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/7065397f-4a9b-4510-838e-37abcab1a8b0/d5pcfmj-73cb13f5-9426-4ae8-beee-78f9480c4609.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzcwNjUzOTdmLTRhOWItNDUxMC04MzhlLTM3YWJjYWIxYThiMFwvZDVwY2Ztai03M2NiMTNmNS05NDI2LTRhZTgtYmVlZS03OGY5NDgwYzQ2MDkucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.91p8hw_kyp5gMF9TpXYNxxO78OxE42dmvI67qBnEnB4",
        in: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/7065397f-4a9b-4510-838e-37abcab1a8b0/d5pcfqc-27c3e3aa-840b-4c69-9dc0-2b8b294d393c.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzcwNjUzOTdmLTRhOWItNDUxMC04MzhlLTM3YWJjYWIxYThiMFwvZDVwY2ZxYy0yN2MzZTNhYS04NDBiLTRjNjktOWRjMC0yYjhiMjk0ZDM5M2MucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.26eFxDnUAstxj3OeyReQT_ajrCDgF4wJXFkfRBW_d3g",
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
        .setImage(img)
        .setDescription(`Spawning a portal to <#${channel.id}>...`);
}

function createOutputEmbed(userId: string, channel: TextChannel, img: string, msgLink: string): MessageEmbed {
    return new MessageEmbed()
        .setImage(img)
        .setDescription(`<@${userId}> opened a portal from <#${channel.id}>!\n[Go back through the portal](${msgLink})`);
}

function createFinalInEmbed(channel: TextChannel, img: string, msgLink: string): MessageEmbed {
    return new MessageEmbed()
        .setImage(img)
        .setDescription(`Opened a portal to <#${channel.id}>!\n[Enter the portal](${msgLink})`);
}