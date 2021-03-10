import { Message, TextChannel, Role, Guild, GuildMember, VoiceChannel } from "discord.js";
import { IBotCommandArgument } from "../../models/types";
import { GetGuild, GetChannelByName } from "../../common/helpers/discord";
import { setInterval } from "timers";

let infractions: IInfraction[];
let infractionData: IInfractionData[] = [];
let handleInfractionRemovalInterval: NodeJS.Timeout;

let successfulInit: boolean = false;

export async function Initialize() {
    const server = await GetGuild();
    if (server) {
        const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
        var mutedRole = server.roles.cache.find(i => i.name.toLowerCase() == "muted");
        if (mutedRole == null) {
            console.error("Couldn't find muted role");
            return;
        }

        await initExistingInfractionData(server);
        handleInfractionRemovalInterval = setInterval(handleInfractionRemoval, 15 * 1000, botChannel, mutedRole);
        handleInfractionRemoval(botChannel, mutedRole);
    }
}

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    if (!successfulInit)
        return;

    const server = await GetGuild();
    if (!server) return;

    const infractionChannel = await GetChannelByName("infraction-log") as TextChannel;
    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    const metaChannel = await GetChannelByName("meta") as TextChannel;

    if (!discordMessage.member?.roles.cache.find(i => i.name.toLowerCase() == "mod")) {
        return;
    }

    if (infractions == undefined)
        return;

    var mutedRole = server.roles.cache.find(i => i.name.toLowerCase() == "muted");
    if (!mutedRole) {
        discordMessage.channel.send(`Couldn't find muted role.`)
        return;
    }

    setupMutedChannelSettings(server, mutedRole);

    const messageLinkArg = args.find(i => i.name == "messageLink"),
        messageLink = messageLinkArg ? messageLinkArg.value : null;

    const discordIdArg = args.find(i => i.name == "discordId"),
        offenderDiscordId = discordIdArg ? discordIdArg.value : null;

    if (!messageLink && !offenderDiscordId) {
        discordMessage.channel.send("A valid \`messageLink\` or \`discordId\` was not provided");
        return;
    }

    const reasonArg = args.find(i => i.name == "reason");
    if (!reasonArg) {
        discordMessage.channel.send("No \`reason\` was specified");
        return;
    }

    let originalMessage = "";
    let member;

    if (offenderDiscordId) {

        member = await server.members.fetch(offenderDiscordId)

    } else if (messageLink) {

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

        const relevantChannel = server.channels.cache.find(i => i.id == channelId) as TextChannel;
        if (!relevantChannel) {
            discordMessage.channel.send("Channel not found");
            return;
        }

        const relevantMessage = await relevantChannel.messages.fetch(messageId);
        if (!relevantMessage) {
            discordMessage.channel.send("Message not found");
            return;
        }

        relevantMessage.attachments.forEach(att => relevantMessage.content += "\n" + att.url);

        if (relevantMessage) {
            originalMessage = `Original message:\n> ${relevantMessage.content}`;
        }

        // Get previous recent infractions
        if (relevantMessage.member)
            member = await server.members.fetch(relevantMessage.member);
    }

    if (member == null) {
        botChannel.send(`Something went wrong. member was somehow null.`);
        return;
    }

    const memberInfraction: IInfraction = findInfractionFor(member);

    member.roles.add(memberInfraction.nextInfraction.role);

    removeInfractionDataFor(member);

    infractions.push({
        member: member,
        worstOffense: memberInfraction.nextInfraction,
        nextInfraction: findNextInfraction(memberInfraction.nextInfraction),
        assignedAt: new Date()
    });

    // Only mute when the infraction isn't a warning
    if (memberInfraction.worstOffense != undefined)
        await member.roles.add(mutedRole);

    // User has no infractions
    if (memberInfraction.worstOffense == undefined) {
        metaChannel.send(`<@${member.id}>, you have been issued a warning. Please remember to follow the rules in the future.\nThis is just a warning and will wear off in 3 days, but further rule violations will result in action`);

        infractionChannel.send(`${discordMessage.member.displayName} has issued a warning for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`); return;
    }

    // If user has a warning and no strikes
    else if (memberInfraction.worstOffense.label == "Warned") {
        metaChannel.send(`<@${member.id}>, you have been issued a strike and a 1 week mute for the following reason:\n> ${reasonArg.value}\n${originalMessage}.\n Please remember to follow the rules in the future. \nThis strike will last for 3 weeks, and another infraction will result in a 3 week mute.`);

        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 1 for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`); return;
    }

    // If user has 1 strike, and needs a 2nd
    else if (memberInfraction.worstOffense.label == "Strike 1") {
        metaChannel.send(`<@${member.id}>, you have been issued Strike 2 and a 3 week mute for the following reason:\n> ${reasonArg.value}\n${originalMessage}.\n Please remember to follow the rules in the future. \nThis strike will last for 2 months, and another infraction will result in a 2 month mute.`);

        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 2 for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`);
    }

    // If user has 2 strikes, and needs a 3rd
    else if (memberInfraction.worstOffense.label == "Strike 2") {
        metaChannel.send(`<@${member.id}>, you have been issued Strike 3 and a 2 month mute for the following reason:\n> ${reasonArg.value}\n${originalMessage}.\n Please remember to follow the rules in the future. \nThis strike will last for 6 months, and another infraction will result in a 6 month mute.`);

        infractionChannel.send(`${discordMessage.member.id} has issued Strike 3 for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`);
    }

    // If user has 3 strikes, needs a 4th    
    else if (memberInfraction.worstOffense.label == "Strike 3") {
        metaChannel.send(`<@${member.id}>, you have been issued Strike 4 and a 6 month mute for the following reason:\n> ${reasonArg.value}\n${originalMessage}.\n Please remember to follow the rules in the future. \nThis strike will last for 18 months. There is no greater punishment. Shame on you.`);
        infractionChannel.send(`${discordMessage.member.displayName} has issued Strike 4 for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`);
    }

    else if (memberInfraction.worstOffense.label == "Strike 4") {
        metaChannel.send(`<@${member.id}>, you have been re-issued Strike 4 and a 6 month mute for the following reason:\n> ${reasonArg.value}\n${originalMessage}.\n Please remember to follow the rules in the future. \nThis strike will last for 18 months. There is no greater punishment. Shame on you.`);
        infractionChannel.send(`${discordMessage.member.displayName} has re-issued Strike 4 for <@${member.id}> for the following reason:\n> ${reasonArg.value}\n${originalMessage}`);
    }
};

async function handleInfractionRemoval(botChannel: TextChannel, mutedRole: Role) {
    const warnedRole = infractionData.find(x => x.label == "Warned")?.role;
    const guild = await GetGuild();
    if (!guild) return;

    for (let infrac of infractions) {
        if (!warnedRole)
            return;

        // These should never be undefined in the actual infractions data
        if (infrac.assignedAt == undefined || infrac.worstOffense == undefined)
            continue;

        // If the user no longer has the role, we can assume it was manually removed.
        if (!infrac.member.roles.cache.find(role => infrac.worstOffense?.role.id == role.id)) {
            botChannel.send(`User <@${infrac.member.id}> is internally recorded as having ${infrac.worstOffense.label}, but doesn't have the corresponding role. Assuming manual role removal, cleaning up data.`);
            continue;
        }

        // Unmute if needed.
        if (infrac.worstOffense.unmuteAfterDays && infrac.assignedAt < xDaysAgo(infrac.worstOffense.unmuteAfterDays)) {
            // Only unmute and send messages if the user is muted.
            if (infrac.member.roles.cache.find(x => x.id == mutedRole.id)) {
                infrac.member.send(`You have been unmuted in the ${guild.name} Discord server.`);
                infrac.member.roles.remove(mutedRole);

                botChannel.send(`<@${infrac.member.id}> has been unmuted`);
            }
        }

        // Remove infraction if needed.
        if (infrac.assignedAt < xDaysAgo(infrac.worstOffense.expiresAfterDays)) {
            const infractionTypeLabel = infrac.worstOffense.label == "Warned" ? "warning" : "infraction";

            infrac.member.send(`Your ${infractionTypeLabel} in the ${guild.name} Discord server has been removed.`);
            infrac.member.roles.remove(infrac.worstOffense.role);
            infrac.member.roles.remove(warnedRole);

            infractions.splice(infractions.findIndex(x => x.member.id == infrac.member.id), 1);
            botChannel.send(`<@${infrac.member.id}>'s ${infractionTypeLabel} has been removed`);
        }
    }
}

async function initExistingInfractionData(server: Guild) {
    const infractionChannel = await GetChannelByName("infraction-log") as TextChannel;

    const warnedRole = server.roles.cache.find(i => i.name.toLowerCase() == "warned");
    const strike1Role = server.roles.cache.find(i => i.name.toLowerCase() == "strike 1");
    const strike2Role = server.roles.cache.find(i => i.name.toLowerCase() == "strike 2");
    const strike3Role = server.roles.cache.find(i => i.name.toLowerCase() == "strike 3");
    const strike4Role = server.roles.cache.find(i => i.name.toLowerCase() == "strike 4");

    if (!warnedRole || !strike1Role || !strike2Role || !strike3Role || !strike4Role) {
        const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
        clearInterval(handleInfractionRemovalInterval)
        botChannel.send(`Unable to init existing infraction data. Missing a warned or strike role.`);
        return;
    }

    infractions = [];
    infractionData = [
        {
            label: "Warned",
            role: warnedRole,
            expiresAfterDays: 14
        },
        {
            label: "Strike 1",
            role: strike1Role,
            expiresAfterDays: 21, // 3 weeks
            unmuteAfterDays: 7
        },
        {
            label: "Strike 2",
            role: strike2Role,
            expiresAfterDays: 63, // ~2 months
            unmuteAfterDays: 21
        },
        {
            label: "Strike 3",
            role: strike3Role,
            expiresAfterDays: 189, // ~6 months
            unmuteAfterDays: 63
        },
        {
            label: "Strike 4",
            role: strike4Role,
            expiresAfterDays: 567, // 18 months
            unmuteAfterDays: 189
        }
    ];

    // These must stay in order for findHighestInfractionRole to work properly
    const infractionRoles = [strike4Role, strike3Role, strike2Role, strike1Role, warnedRole];

    // Build a list of all users' current infractions. We're using the infraction channel as a makeshift database.
    for (let message of (await infractionChannel.messages.fetch({ limit: 100 }))) {
        if (!message)
            continue;

        const mentionedMember = message[1].mentions.members?.first();

        if (mentionedMember == null)
            continue;

        // If we already found an infraction for this user
        if (infractions.find(i => i.member.id == mentionedMember.id) != undefined)
            continue;

        // Find the worst offense they have in their roles.
        // The newer the offense is, the higher and more up to date it should be (if checking messages in the channel)

        const worstOffense = findHighestInfractionRole(mentionedMember, infractionRoles);

        if (worstOffense != undefined) {
            const strikeData = infractionData.find(i => i.role.id == worstOffense.id);

            infractions.push({
                member: mentionedMember,
                worstOffense: strikeData,
                nextInfraction: findNextInfraction(strikeData),
                assignedAt: message[1].createdAt
            });
        }

    }

    successfulInit = true;
}

function setupMutedChannelSettings(server: Guild, mutedRole: Role) {
    server.channels.cache.forEach(channel => {
        if (channel.type === "text") {
            (channel as TextChannel).createOverwrite(mutedRole, { "SEND_MESSAGES": false, "ADD_REACTIONS": false });
        }

        if (channel.type == "voice") {
            (channel as VoiceChannel).createOverwrite(mutedRole, { "SPEAK": false, "STREAM": false });
        }
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
        if (member.roles.cache.find(i => role.id == i.id)) return role;
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
    let index: number;

    while ((index = infractions.findIndex(x => x.member.id == member.id)) != -1) {
        infractions.splice(index, 1);
    }
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
