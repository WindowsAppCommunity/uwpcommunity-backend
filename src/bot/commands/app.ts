import { IBotCommandArgument } from "../../models/types.js";
import { Message, TextChannel, Role, GuildMember } from "discord.js";
import { GetUser, GetRoles, GetGuild, GetGuildMembers } from "../../common/discord.js";
import * as Bluebird from "bluebird";
import { GetFirstUserBy, GetUserByDiscordId, GetUsersBy, IUserMap, LoadUserAsync, SaveUserAsync } from "../../api/sdk/users.js";
import { IProject } from "../../api/sdk/interface/IProject.js";
import { IDiscordConnection } from "../../api/sdk/interface/IUserConnection.js";
import projects, { GetProjectsBy, IProjectMap, SaveProjectAsync } from "../../api/sdk/projects.js";
import { Dag, Ipns } from "../../api/sdk/helia.js";
declare global { export interface Promise<T> extends Bluebird<T> { } }
import { peerIdFromString, peerIdFromCID } from "@libp2p/peer-id";
import { IUser } from "../../api/sdk/interface/IUser.js";



// This architecture here works a bit different than other places. 
// Instead of validating all arguments at the start of the command in the default function, then having to do the rest in thise scope
// We validate the required parameters first, then move to handleProjectCommand and pass the project, original message, and command arguments in
// This way, each command variation has its own function and argument scope, and things are kept clean 

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {

    const projectName = commandParts[0]?.toLowerCase();
    if (!projectName) {
        (message.channel as TextChannel).send(`No project name provided`);
        return;
    }

    const projectMap = await findProject(projectName, (message.channel as TextChannel) as TextChannel);
    if (!projectMap)
        return;

    if (!commandParts[1]) {
        (message.channel as TextChannel).send(`Please supply app command. Valid commands are\`details\` or \`user\``);
        return;
    }

    switch (commandParts[1]) {
        case "details":
            await getProjectDetails(projectMap, message);
            break;
        case "user":
            await handleUserCommand(projectMap, message, commandParts, args);
            break;
        default:
            (message.channel as TextChannel).send(`Unknown command "${commandParts[1]}"`);
    }
    // TODO:
    // List projects for a user (!getuser apps)
    // Give other users roles
};


async function handleUserCommand(projectMap: IProjectMap, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    // User type
    //    - Beta tester
    //    - Translator
    //    - Collaborator
    //    - Advocate
    //    - Patreon
    //    - Lead
    //    - Support
    // User identifier
    //    - discordId
    //    - username

    var user = await GetUserByDiscordId(message.author.id);
    if (!user) {
        (message.channel as TextChannel).send(`You aren't registered on the community website\nRegister at https://uwpcommunity.com/`);
        return;
    }

    const project = projectMap.project;
    const userIsOwner = !!project.collaborators.find(x => x.role.name.toLowerCase() == "owner" && x.user == user?.ipnsCid);
    const userIsMod = message.member?.roles.cache.find(i => i.name.toLowerCase() == "mod" || i.name.toLowerCase() == "admin");

    const userIdLead = !!project.collaborators.find(x => x.role.name.toLowerCase() == "lead" && x.user == user?.ipnsCid);
    const userIsSupport = !!project.collaborators.find(x => x.role.name.toLowerCase() == "support" && x.user == user?.ipnsCid);
    const userIsDev = !!project.collaborators.find(x => x.role.name.toLowerCase().includes("dev") && x.user == user?.ipnsCid);

    const userCanModify = userIsOwner || userIdLead || userIsSupport || userIsDev || userIsMod;
    const userCanModifyDevs = userIsOwner || userIdLead || userIsSupport || userIsMod;
    const userCanModifyLead = userIsOwner || userIsMod;

    if (!userCanModify) {
        (message.channel as TextChannel).send(`Only the project owner, project lead, support staff, or a dev can manage users`);
        return;
    }

    if (commandParts[2] != "add" && commandParts[2] != "remove") {
        (message.channel as TextChannel).send(`Please specify a user command. Valid values are \`add\` and \`remove\``);
        return;
    }

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        (message.channel as TextChannel).send(`Please specify a user type argument. Valid values are \`tester\`, \`translator\`, \`dev\`, \`advocate\`, \`patreon\`, \`lead\`, and \`support\`\nExample: \`/type translator\``);
        return;
    }

    if (!userCanModifyDevs && typeArg.value == "dev") {
        (message.channel as TextChannel).send(`Only the project owner, project lead, or support staff can manage devs on this project.`);
        return;
    }

    if (!userCanModifyLead && typeArg.value == "lead") {
        (message.channel as TextChannel).send(`Only the project owner can manage project lead role.`);
        return;
    }

    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    if (!userArg) {
        (message.channel as TextChannel).send(`Please specify a username or discordId\nExample: \`/discordId 714896135382368340\` or \`/username Panos#0309\``);
        return;
    }

    switch (commandParts[2]) {
        case "add":
            await handleAddUserCommand(projectMap, message, commandParts, args).catch((message.channel as TextChannel).send);
            break;
        case "remove":
            await handleRemoveUserCommand(projectMap, message, commandParts, args).catch((message.channel as TextChannel).send);
            break;
        default:
            (message.channel as TextChannel).send(`Unknown command. Valid commands for managing users are "add" and "remove"`);
    }
}

async function handleAddUserCommand(projectMap: IProjectMap, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    const desiredDiscordRole: Role | undefined | null = await getRoleForProject(projectMap, message, commandParts, args);
    if (desiredDiscordRole == null) return;

    let discordUser: GuildMember | undefined;
    const guildMembers = await GetGuildMembers();
    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");

    // Get target user
    switch (userArg?.name) {
        case "username":
            discordUser = guildMembers?.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value);
            break;
        case "discordId":
            discordUser = guildMembers?.find(m => m.user.id === userArg.value);
            break;
        default:
            (message.channel as TextChannel).send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (!discordUser)
        return;

    const roleType = args?.find(i => i.name == "type")?.value;
    if (!roleType)
        return;

    const userMap = await GetUserByDiscordId(discordUser.id);
    if (!userMap) {
        (message.channel as TextChannel).send(`User isn't registered on the community website\nRegister at https://uwpcommunity.com/`);
        return;
    }

    // Check for existing identical collaborator role
    const existing = !!projectMap.project.collaborators.filter(x => x.user == userMap.ipnsCid && x.role.name == desiredDiscordRole.name);
    if (existing) {
        (message.channel as TextChannel).send(`User is already a ${roleType} on this project`);
        return;
    }

    safeAddRole(desiredDiscordRole, discordUser);

    projectMap.project.collaborators.push({ user: userMap.ipnsCid, role: { name: roleType } })

    if (!userMap.user.projects.includes(projectMap.ipnsCid))
        userMap.user.projects.push(projectMap.ipnsCid);

    // Save project
    var promise = Promise.all([
        SaveUserAsync(userMap.ipnsCid, userMap.user),
        SaveProjectAsync(projectMap.ipnsCid, projectMap.project)
    ]);

    await ReactWithPromiseStatus(promise, message)
        .catch(err => (message.channel as TextChannel).send(err));
}

async function handleRemoveUserCommand(projectMap: IProjectMap, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    let discordUser: GuildMember | undefined;

    const guildMembers = await GetGuildMembers();

    // Get target user
    switch (userArg?.name) {
        case "username":
            discordUser = guildMembers?.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value)
            break;
        case "discordId":
            discordUser = guildMembers?.find(m => m.user.id === userArg.value)
            break;
        default:
            (message.channel as TextChannel).send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (!discordUser)
        return;

    const roleType = args?.find(i => i.name == "type")?.value;
    if (!roleType)
        return;

    const userMap = await GetUserByDiscordId(discordUser.id);
    if (!userMap) {
        (message.channel as TextChannel).send(`User not found. Please register at https://uwpcommunity.com/`);
        return;
    }

    const collaborators = projectMap.project.collaborators.filter(x => x.user == userMap.ipnsCid && x.role.name == roleType);
    if (!collaborators) {
        (message.channel as TextChannel).send(`User isn't registered as a ${roleType} on this project`);
        return;
    }

    // Remove discord role
    const desiredDiscordRole: Role | undefined | null = await getRoleForProject(projectMap, message, commandParts, args).catch(Promise.reject);
    if (!desiredDiscordRole)
        return;

    safeRemoveRole(desiredDiscordRole, discordUser);

    projectMap.project.collaborators = projectMap.project.collaborators.filter(x => x.user != userMap.ipnsCid && x.role.name != roleType);

    // If this was the last collaborative role, remove the project from the user's profile.
    if (projectMap.project.collaborators.filter(x => x.user == userMap.ipnsCid))
        userMap.user.projects = userMap.user.projects.filter(x => x != projectMap.ipnsCid);

    // Save project
    var promise = Promise.all([
        SaveUserAsync(userMap.ipnsCid, userMap.user),
        SaveProjectAsync(projectMap.ipnsCid, projectMap.project)
    ]);

    await ReactWithPromiseStatus(promise, message)
        .catch(err => (message.channel as TextChannel).send(err));
}

function safeRemoveRole(role: Role | undefined, discordUser: GuildMember) {
    if (role)
        discordUser.roles.remove(role);
}

function safeAddRole(role: Role | undefined, discordUser: GuildMember) {
    if (role)
        discordUser.roles.add(role);
}

/**
 * @returns Role if a discord role is found. Undefined if no matching discord role is found. Null if the role was never searched for (usually because of some handled error).
 */
async function getRoleForProject(projectMap: IProjectMap, message: Message, commandParts: string[], args: IBotCommandArgument[]): Promise<Role | undefined | null> {
    const roles = await GetRoles();

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        (message.channel as TextChannel).send(`Please specify a role type argument. Valid values are \`tester\`, \`translator\`, \`dev\`, \`advocate\`, \`patreon\`, \`lead\`, and \`support\`\nExample: \`/type translator\``);
        return null;
    }

    // Should be a regex that captures one group (the app name)
    let appNameInRoleRegex: RegExp;

    switch (typeArg.value) {
        case "tester":
            appNameInRoleRegex = /Beta Tester \((.+)\)/;
            break;
        case "translator":
            appNameInRoleRegex = /Translator \((.+)\)/;
            break;
        case "dev":
            appNameInRoleRegex = /(.+) Dev/;
            break;
        case "advocate":
            appNameInRoleRegex = /(.+) Advocate/;
            break;
        case "support":
            appNameInRoleRegex = /(.+) Support/;
            break;
        case "lead":
            appNameInRoleRegex = /(.+) Lead/;
            break;
        case "patreon":
            appNameInRoleRegex = /(.+) Patreon/;
            break;
        default:
            (message.channel as TextChannel).send(`${typeArg.value} is not a valid role type. Valid values are \`tester\`, \`translator\`, \`dev\`, \`advocate\`, \`patreon\`, \`lead\`, and \`support\`\nExample: \`/type translator\``);
            return null;
    }

    const matchedRoles = roles?.filter(role => {
        const matchingRoles = Array.from(role.name.matchAll(appNameInRoleRegex));
        if (!matchingRoles || matchingRoles.length === 0) {
            return;
        }

        const appName = matchingRoles[0][1]?.toLowerCase();
        return projectMap.project.name.toLowerCase().includes(appName);
    })

    if (!matchedRoles || matchedRoles.length == 0) {
        message.author.send(`Your request was processed, but no ${typeArg.value} role was found for ${projectMap.project.name}.\nIf you are in need of a role for your app, please ask a Moderator to assist. (User will need to be re-added or given the role manually)`);
        return;
    }

    return matchedRoles?.shift();
}


async function getProjectDetails(projectMap: IProjectMap, message: Message) {
    if (!Ipns)
        throw new Error("Ipns is not defined");

    // Make sure the details are being sent to the project channel if private
    if (projectMap.project.isPrivate) {
        const channelName: string = ((message.channel as TextChannel) as TextChannel).name.replace("-", " ");

        if (!channelName.includes(projectMap.project.name.toLowerCase())) {
            (message.channel as TextChannel).send(`Project is private or not found`);
            return;
        }
    }

    if (projectMap.project.needsManualReview) {
        (message.channel as TextChannel).send(`Project is awaiting ownership verification and review.`);
        return;
    }

    const messageEmbedFields = [
        { name: "Category", value: projectMap.project.category },
        { name: "Created", value: new Date(projectMap.project.createdAtUnixTime).toUTCString() + " UTC" }
    ];

    for (let link of projectMap.project.links) {
        messageEmbedFields.push({ name: link.name, value: link.url });
    }

    for (let collaborator of projectMap.project.collaborators) {
        var existingField = messageEmbedFields.find(x => x.name == collaborator.role.name);
        var fieldLabel = existingField?.value ?? "";

        var cid = await Ipns.resolve(peerIdFromCID(collaborator.user))
        var user = await Dag?.get<IUser>(cid);

        var label = user?.connections.filter(x => x as IDiscordConnection)
            .map(x => (x as IDiscordConnection)?.discordId)
            .map(x => `<@${x}}>`)
            .join(" ");

        fieldLabel += `${label}\n`;

        if (existingField)
            existingField.value = fieldLabel;
        else
            messageEmbedFields.push({ name: collaborator.role.name, value: fieldLabel });
    }

    const sanitizedDesc = projectMap.project.description.replace("*", "\\*").replace("_", "\\_").replace("\\", "\\\\").replace("~", "\\~");

    const messageEmbed: any = {
        title: projectMap.project.name,
        image: { url: projectMap.project.heroImage },
        description: sanitizedDesc,
        fields: messageEmbedFields,
        timestamp: new Date()
    };

    if (projectMap.project.icon)
        messageEmbed.thumbnail = { url: projectMap.project.icon };

    // TODO: include the app channel if present
    (message.channel as TextChannel).send(messageEmbed);
}

async function findProject(projectName: string, srcChannel: TextChannel): Promise<IProjectMap | undefined> {
    const matchedProjects = await GetProjectsBy(x => x.project.name.toLowerCase() == projectName || x.project.name.toLowerCase().includes(projectName) || projectName.includes(x.project.name.toLowerCase()));

    if (!matchedProjects || matchedProjects.length == 0) {
        srcChannel.send(`Project is private or not found.`);
        return;
    }

    if (matchedProjects.length > 1) {
        srcChannel.send(`Multiple projects found, please be more specific`);
        return;
    }

    return { project: matchedProjects[0], ipnsCid: projects.find(x => x.project == matchedProjects[0])!.ipnsCid };
}

async function ReactWithPromiseStatus<T>(promise: Promise<T>, message: Message) {
    const guild = await GetGuild();
    if (!guild)
        return;

    await promise
        .then(() => {
            const greencheckEmojiId = guild.emojis.cache.find(i => i.name == "greencheck")?.id;
            if (greencheckEmojiId)
                message.react(greencheckEmojiId);
        })
        .catch(err => {
            const reactionId = guild.emojis.cache.find(i => i.name == "bug")?.id;
            if (reactionId) message.react(reactionId);

            (message.channel as TextChannel).send(err);
        });
}
