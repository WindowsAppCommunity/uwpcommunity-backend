import { Message, TextChannel, GuildMember } from "discord.js";
import { bot, GetChannelByName, GetGuildChannels } from "../../../common/helpers/discord";
import { getAllProjects } from "../../../models/Project";

var sentenceStops: string[] = [".", "...", ":", "!"];

var interjections: string[] = ["woah there,", "wait a sec.", "hey!", "hold on.", "<@271332522095411202>'s words echoed..."];

var quips: string[] = ["is that dev talk?", "heard you like programming.", "programming is fun, but...", "there's a time and place for dev talk, but not here."];

export async function devChatterWarning(discordMessage: Message) {
    var generalChannel = await GetChannelByName("user-chat") as TextChannel;

    if (!generalChannel || discordMessage.channel.id != generalChannel.id)
        return;

    // Allow links regardless of possible dev talk.
    if (discordMessage.content.includes("http"))
        return;

    let matched: string[] | undefined = discordMessage.content.match(/(?:[A-Z][a-z]{2,}){3,}|`.+?`/g)?.map(x => x);

    if (matched != null && matched.length > 0) {

        var projects = await getAllProjects();

        // If the message contains the name of a project, ignore the entire message.
        // If the conversation has not been properly redirected,
        // and subsequent messages contain dev chatter, it'll be caught.
        for (const project of projects) {
            if (matched?.includes(project.appName))
                return;
        }

        var interjection = interjections[Math.floor(Math.random() * interjections.length - 1) + 1];
        var quip = quips[Math.floor(Math.random() * quips.length - 1) + 1];

        // If we get the professor oak reference, make sure the second half matches.
        if (interjection == interjections[interjections.length - 1]) {
            quip = `"${quips[quips.length - 1]}"`;
        }

        if (lastCharacterIsSentenceStop(interjection)) {
            quip = capitalizeFirstLetter(quip);
        }

        var msg = await discordMessage.reply(`${interjection} ${quip}\n<#372137812037730306> is for your average user. Try using <#663434534087426129> instead.\n\n> _Need help? Try <#580484470877061120>, <#580484525075857428>, or another dev channel that fits your needs._`);

        bot.on("messageDelete", async deletedMsg => {
            if (deletedMsg.id == discordMessage.id)
                await msg.delete();
        });
    }
}

function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function lastCharacterIsSentenceStop(str: string): boolean {
    for (const item of sentenceStops)
        if (str.endsWith(item))
            return true;

    return false;
}