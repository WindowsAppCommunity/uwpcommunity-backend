import { Message, TextChannel, Role, Guild, GuildMember, GuildChannel, Collection } from "discord.js";
import { IBotCommandArgument } from "../../models/types";
import { GetGuild, bot } from "../../common/helpers/discord";
import { setInterval } from "timers";

let infractions: IInfraction[];
let infractionData: IInfractionData[] = [];
let mutedRole: Role;


export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
/*     
    const server = GetGuild();
    if (!server) return;

    if (!discordMessage.member.roles.find(i => i.name.toLowerCase() == "mod")) {
        discordMessage.channel.send("Go away, Matthew");
    }

    if (infractions == undefined) {
        await initExistingInfractionData(server);
    }
    setupMutedChannelSettings(server);
    mutedRole = server.roles.find(i => i.name.toLowerCase() == "muted");

    const messageLinkArg = args.find(i => i.name == "messageLink"),
        messageLink = messageLinkArg ? messageLinkArg.value : null;

    if (!messageLink) {
        discordMessage.channel.send("A valid \`messageLink\` was not provided");
        return;
    }

    const reasonArg = args.find(i => i.name == "reason");
    if (!reasonArg) {
        discordMessage.channel.send("No \`reason\` was specified");
        return;
    }

    const messageParts = messageLink.split("/");

    if (!messageParts) {
        discordMessage.channel.send(`Invalid link format`);
        return;
    }

    const serverId = messageParts[4];
    const channelId = messageParts[5];
    const messageId = messageParts[6];

    if (!serverId || !channelId || !messageId) {
        discordMessage.channel.send(`Missing data from link`);
        return;
    }

    if (serverId != server.id) {
        discordMessage.channel.send("Link is from a different server");
        return;
    }

    const relevantChannel = server.channels.find(i => i.id == channelId) as TextChannel;
    if (!relevantChannel) {
        discordMessage.channel.send("Channel not found");
        return;
    }

    const relevantMessage = await relevantChannel.fetchMessage(messageId);
    if (!relevantMessage) {
        discordMessage.channel.send("Message not found");
        return;
    }

    relevantMessage.attachments.forEach(att => relevantMessage.content += "\n" + att.url);

    const botChannel = server.channels.find(i => i.name == "bot-stuff") as TextChannel;
    const infractionChannel = server.channels.find(i => i.name == "infraction-log") as TextChannel;

    // Get previous recent infractions
    const member = relevantMessage.member;

    setInterval(() => handleInfractionRemoval(botChannel), 60 * 60 * 1000);

    const memberInfraction: IInfraction = findInfractionFor(member);

    member.addRole(memberInfraction.nextInfraction.role);

    removeInfractionDataFor(member);

    infractions.push({
        member: member,
        worstOffense: memberInfraction.nextInfraction,
        nextInfraction: findNextInfraction(memberInfraction.worstOffense),
        assignedAt: new Date()
    });

    // Only mute when the infraction isn't a warning
    if (memberInfraction.worstOffense != undefined)
        await member.addRole(mutedRole);

    // User has no infractions
    if (memberInfraction.worstOffense == undefined) {
        discordMessage.channel.send(`<@${member.id}>, you have been issued a warning. Please remember to follow the rules in the future.\nThis is just a warning and will wear off in 3 days, but further rule violations will result in action`);


        infractionChannel.send(`${discordMessage.member.displayName} has issued a warning for <@${member.id}>for the following reason:\n> ${reasonArg.value}\nOriginal message:\n> ${relevantMessage.content}`); return;
    }

    // If user has a warning and no strikes
    if (memberInfraction.worstOffense.label == "Warned") {
        discordMessage.channel.send(`<@${member.id}>, you have been issued a strike and a 1 day mute. Please remember to follow the rules in the future. \nThis strike will last for 1 week, and a second strike will result in a 3 day mute.`);


        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 1 for <@${member.id}>for the following reason:\n> ${reasonArg.value}\nOriginal message:\n> ${relevantMessage.content}`); return;
    }

    // If user has 1 strike, and needs a 2nd
    if (memberInfraction.worstOffense.label == "Strike 1") {
        discordMessage.channel.send(`<@${member.id}>, you have been issued Strike 2 and a 3 day mute. Please remember to follow the rules in the future. \nThis strike will last for 2 weeks. The next strike will result in a 10 day mute and a 30 day Strike 3`);

        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 2 for <@${member.id}>for the following reason:\n> ${reasonArg.value}\nOriginal message:\n> ${relevantMessage.content}`);
    }

    // If user has 2 strikes, and needs a 3rd
    if (memberInfraction.worstOffense.label == "Strike 2") {
        discordMessage.channel.send(`<@${member.id}>, you have been issued Strike 3 and a 10 day mute. Please remember to follow the rules in the future. \nThis strike will last for 30 days. The next strike will result in a 30 day mute and 60 day strike 4`);


        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 3 for <@${member.id}>for the following reason:\n> ${reasonArg.value}\nOriginal message:\n> ${relevantMessage.content}`);
    }

    // If user has 3 strikes, needs a 4th    
    if (memberInfraction.worstOffense.label == "Strike 3") {
        discordMessage.channel.send(`<@${member.id}>, you have been issued Strike 4 and a 30 day mute. Please remember to follow the rules in the future. \nThis strike will last for 2 months. There is no greater punishment. Shame on you.`);


        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 4 for <@${member.id}>for the following reason:\n> ${reasonArg.value}\nOriginal message:\n> ${relevantMessage.content}`);
    }
    const removeArg = args.find(i => i.name == "remove");
    if (removeArg) {
        discordMessage.delete();
    } */
};

function handleInfractionRemoval(botChannel: TextChannel) {
    for (let infrac of infractions) {
        // These should never be undefined in the actual infractions data
        if (infrac.assignedAt == undefined || infrac.worstOffense == undefined)
            return;

        if (infrac.worstOffense.unmuteAfterDays && infrac.assignedAt > xDaysAgo(infrac.worstOffense.unmuteAfterDays)) {
            infrac.member.send(`You have been unmuted in the UWP Community Discord server.`);
            infrac.member.removeRole(mutedRole);
            botChannel.send(`<@${infrac.member.id}> has been unmuted`);
        }

        if (infrac.assignedAt > xDaysAgo(infrac.worstOffense.expiresAfterDays)) {
            infrac.member.send(`Your infraction in the UWP Community Discord server has been removed.`);
            infrac.member.removeRole(infrac.worstOffense.role);
            botChannel.send(`<@${infrac.member.id}>'s infraction has been removed`);
        }
    }
}

async function initExistingInfractionData(server: Guild) {
    const infractionChannel = server.channels.find(i => i.name == "infraction-log") as TextChannel;

    const warnedRole = server.roles.find(i => i.name.toLowerCase() == "warned");
    const strike1Role = server.roles.find(i => i.name.toLowerCase() == "strike 1");
    const strike2Role = server.roles.find(i => i.name.toLowerCase() == "strike 2");
    const strike3Role = server.roles.find(i => i.name.toLowerCase() == "strike 3");
    const strike4Role = server.roles.find(i => i.name.toLowerCase() == "strike 4");

    infractions = [];
    infractionData = [
        {
            label: "Warned",
            role: warnedRole,
            expiresAfterDays: 3
        },
        {
            label: "Strike 1",
            role: strike1Role,
            expiresAfterDays: 7,
            unmuteAfterDays: 1
        },
        {
            label: "Strike 2",
            role: strike2Role,
            expiresAfterDays: 14,
            unmuteAfterDays: 3
        },
        {
            label: "Strike 3",
            role: strike3Role,
            expiresAfterDays: 30,
            unmuteAfterDays: 10
        },
        {
            label: "Strike 4",
            role: strike4Role,
            expiresAfterDays: 60,
            unmuteAfterDays: 30
        }
    ];

    // These must stay in order for findHighestInfractionRole to work properly
    const infractionRoles = [strike4Role, strike3Role, strike2Role, strike1Role, warnedRole];

    // build a list of users' current infractions
    for (let message of (await infractionChannel.fetchMessages({ limit: 100 }))) {
        // If we already found an infraction for this user
        if (infractions.find(i => i.member.id == message[1].mentions.members.first().id) != undefined)
            continue;

        // Find the worst offense they have in their roles.
        // The newer the offense is, the higher and more up to date it should be (if checking messages in the channel)

        const relevantMember = message[1].mentions.members.first();
        const worstOffense = findHighestInfractionRole(relevantMember, infractionRoles);

        if (worstOffense != undefined) {
            const strikeData = infractionData.find(i => i.role.id == worstOffense.id);

            infractions.push({
                member: message[1].mentions.members.first(),
                worstOffense: strikeData,
                nextInfraction: findNextInfraction(strikeData),
                assignedAt: message[1].createdAt
            });
        }

    }
}

function setupMutedChannelSettings(server: Guild) {
    server.channels.forEach(channel => {
        (channel as TextChannel).overwritePermissions(mutedRole, { "SEND_MESSAGES": false });
    });
}

function findNextInfraction(infraction: IInfractionData | undefined): IInfractionData {
    if (infraction == undefined) return infractionData[0];

    const currentIndex = infractionData.indexOf(infraction);
    if (currentIndex == infractionData.length - 1)
        return infractionData[infractionData.length - 1];

    return infractionData[currentIndex + 1];
}

function findHighestInfractionRole(member: GuildMember, roles: Role[]): Role | undefined {
    for (let role of roles) {
        if (member.roles.find(i => role.id == i.id)) return role;
    }
}

function findInfractionFor(member: GuildMember): IInfraction {
    for (let infraction of infractions)
        if (infraction.member.id == member.id)
            return infraction;

    return {
        member: member,
        worstOffense: undefined,
        nextInfraction: infractionData[0]
    }
}

function removeInfractionDataFor(member: GuildMember) {
    infractions = infractions.filter(i => i.member.id != member.id);
}


function xDaysAgo(days: number) {
    var b = new Date();
    b.setDate(b.getDate() - days);
    return b;
}


interface IInfraction {
    member: GuildMember;
    worstOffense: IInfractionData | undefined;
    nextInfraction: IInfractionData;
    assignedAt?: Date;
}

interface IInfractionData {
    label: string;
    role: Role;
    expiresAfterDays: number;
    unmuteAfterDays?: number;
}