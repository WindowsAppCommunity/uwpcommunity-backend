import { IBotCommandArgument, IProject } from "../../models/types";
import { Message, TextChannel, Role, User, GuildMember } from "discord.js";
import Project, { findSimilarProjectName, DbToStdModal_Project } from "../../models/Project";
import { GetUser, GetGuildRoles, GetDiscordUser, GetGuild } from "../../common/helpers/discord";
import UserProject, { GetUsersByProjectId, GetProjectsByUserId, GetProjectCollaborators } from "../../models/UserProject";
import { GetRoleByName } from "../../models/Role";

import { getUserByDiscordId } from "../../models/User";

// This architecture here works a bit different than other places. 
// Instead of validating all arguments at the start of the command in the default function, then having to do the rest in thise scope
// We validate the required parameters first, then move to handleProjectCommand and pass the project, original message, and command arguments in
// This way, each command variation has its own function and argument scope, and things are kept clean 

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {

    const projectName = commandParts[0]?.toLowerCase();
    if (!projectName) {
        message.channel.send(`No project name provided`);
        return;
    }

    const project = await findProject(projectName, message.channel as TextChannel);
    if (!project)
        return;

    if (!commandParts[1]) {
        message.channel.send(`Please supply app command. Valid commands are\`details\` or \`user\``);
        return;
    }

    switch (commandParts[1]) {
        case "details":
            await getProjectDetails(project, message);
            break;
        case "user":
            await handleUserCommand(project, message, commandParts, args);
            break;
        default:
            message.channel.send(`Unknown command "${commandParts[1]}"`);
    }
    // TODO:
    // List projects for a user (!getuser apps)
    // Give other users roles
};


async function handleUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    // User type
    //    - Beta tester
    //    - Translator 
    //    - Collaborator
    // User identifier
    //    - discordId
    //    - username

    const isOwner = project.collaborators.find(collaborator => collaborator.isOwner)?.discordId == message.author.id;
    const isCollaborator = project.collaborators.find(collaborator => collaborator.discordId == message.author.id);
    const isMod = message.member.roles.find(i => i.name.toLowerCase() == "mod" || i.name.toLowerCase() == "admin");
    const userCanModify = isOwner || isCollaborator || isMod;
    const userCanModifyDevs = isOwner || isMod;

    // Need to add existing users to database
    // And remove the roles for users that aren't registered on the website

    if (!userCanModify) {
        message.channel.send(`Only devs or the project owner can manage users`);
        return;
    }

    if (commandParts[2] != "add" && commandParts[2] != "remove") {
        message.channel.send(`Please specify a user command. Valid values are \`add\` and \`remove\``);
        return;
    }

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a user type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
        return;
    }

    if (!userCanModifyDevs && typeArg.value == "dev") {
        message.channel.send(`Only the project owner can manage devs on this project.`);
        return;
    }

    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    if (!userArg) {
        message.channel.send(`Please specify a username or discordId\nExample: \`/discordId 714896135382368340\` or \`/username Panos#0309\``);
        return;
    }

    switch (commandParts[2]) {
        case "add":
            await handleAddUserCommand(project, message, commandParts, args).catch(message.channel.send);
            break;
        case "remove":
            await handleRemoveUserCommand(project, message, commandParts, args).catch(message.channel.send);
            break;
        default:
            message.channel.send(`Unknown command. Valid commands for managing users are "add" and "remove"`);
    }
}

async function handleAddUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    const desiredRole: Role | undefined | null = await getRoleForProject(project, message, commandParts, args);
    if(desiredRole == null) return;

    let discordUser: GuildMember | undefined;
    const guild = await GetGuild()?.fetchMembers();
    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");


    // Get target user
    switch (userArg?.name) {
        case "username":
            discordUser = guild?.members.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value);
            break;
        case "discordId":
            discordUser = guild?.members.find(m => m.user.id === userArg.value);
            break;
        default:
            message.channel.send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (!discordUser) return;

    const roleType = args?.find(i => i.name == "type")?.value;
    if (!roleType) return;

    const user = await getUserByDiscordId(discordUser.id);
    if (!user) {
        message.channel.send(`User isn't registered on the community website\nRegister at https://uwpcommunity.com/`);
        return;
    }

    const contributorRole = await GetRoleByName(InputtedUserTypeToDBRoleType(roleType));

    if (!contributorRole) return;
    if (!project.id) return;

    // Check for existing identical UserProject
    const existing = await UserProject.findOne({ where: { roleId: contributorRole.id, userId: user.id, projectId: project.id } });
    if (existing) {
        message.channel.send(`User is already a ${roleType} on this project`);
        return;
    }

    safeAddRole(desiredRole, discordUser);


    // Create UserProject
    await ReactWithPromiseStatus(UserProject.create(
        {
            userId: user.id,
            projectId: project.id,
            isOwner: false, // Only the project owner can create the project
            roleId: contributorRole.id
        }), message)
        .catch(err => message.channel.send(err));
}


async function handleRemoveUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    const desiredRole: Role | undefined | null= await getRoleForProject(project, message, commandParts, args).catch(Promise.reject);
    if(desiredRole == null) return;

    const guild = GetGuild();
    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    let discordUser: GuildMember | undefined;

    // Get target user
    switch (userArg?.name) {
        case "username":
            discordUser = guild?.members.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value)
            break;
        case "discordId":
            discordUser = guild?.members.find(m => m.user.id === userArg.value)
            break;
        default:
            message.channel.send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (!discordUser) return;

    const RelevantUser = await getUserByDiscordId(discordUser.id);
    if (!RelevantUser) {
        message.channel.send(`User not found. Please register at https://uwpcommunity.com/`);
        return;
    }

    const projects = await GetProjectsByUserId(RelevantUser.id);
    if (!project || projects.length === 0) {
        message.channel.send(`User isn't registered as a ${args.find(arg => arg.name == "type")?.value} on this project`);
        return;
    }

    const relevantProjects = projects.filter(i => project.id == i.id);
    if (relevantProjects.length === 0) {
        message.channel.send(`No relevant projects found for user`);
        return;
    }

    const roleType = args?.find(i => i.name == "type")?.value;
    if (!roleType) return;

    const contributorRole = await GetRoleByName(InputtedUserTypeToDBRoleType(roleType));
    if (!contributorRole) return;

    const user = await getUserByDiscordId(discordUser.id);
    if (!user) {
        message.channel.send(`User isn't registered on the community website\nRegister at https://uwpcommunity.com/`);
        return;
    }

    const RelevantUserProjects = await UserProject.findAll({ where: { projectId: relevantProjects[0].id, userId: user.id, roleId: contributorRole.id } }).catch(Promise.reject);

    if (RelevantUserProjects.length == 0) {
        message.channel.send(`User isn't registered for this role on this project`);
        return;
    }

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a role type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
        return;
    }

    const existingUserProject = RelevantUserProjects.filter(async (i) => i.roleId == (await GetRoleByName(InputtedUserTypeToDBRoleType(typeArg.value)))?.id)[0];

    const dataActionsPromise = Promise.all([
        safeRemoveRole(desiredRole, discordUser),
        existingUserProject.destroy()
    ]);

    await ReactWithPromiseStatus(dataActionsPromise, message)
        .catch(message.channel.send);
}

function safeRemoveRole(role: Role | undefined, discordUser: GuildMember) {
    if (role)
        discordUser.removeRole(role);
}

function safeAddRole(role: Role | undefined, discordUser: GuildMember) {
    if (role)
        discordUser.addRole(role);
}

function InputtedUserTypeToDBRoleType(inputtedRole: string): string {
    switch (inputtedRole) {
        case "tester":
            return "Beta Tester";
        case "translator":
            return "Translator";
        case "dev":
            return "Developer";
        default:
            return "Other";
    }
}


/**
 * @returns Role if a discord role is found. Undefined if no matching discord role is found. Null if the role was never searched for (usually because of some handled error).
 */
async function getRoleForProject(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]): Promise<Role | undefined | null> {
    const roles = await GetGuildRoles();

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a role type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
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
        default:
            message.channel.send(`${typeArg.value} is not a valid role type. Expected \`tester\`, \`translator\` or \`dev\``);
            return null;
    }

    const matchedRoles = roles?.filter(role => {
        const matchingRoles = Array.from(role.name.matchAll(appNameInRoleRegex));
        if (!matchingRoles || matchingRoles.length === 0) {
            return;
        }

        const appName = matchingRoles[0][1]?.toLowerCase();
        return project.appName.toLowerCase().includes(appName);
    })

    if (!matchedRoles || matchedRoles.length == 0) {
        message.author.send(`Your request was processed, but no ${typeArg.value} role was found for ${project.appName}.\nIf you are in need of a role for your app, please ask a Moderator to assist. (User will need to be re-added or given the role manually)`);
        return;
    }


    return matchedRoles?.shift();
}


async function getProjectDetails(project: IProject, message: Message) {
    // Make sure the details are being sent to the project channel if private
    if (project.isPrivate) {
        const channelName: string = (message.channel as TextChannel).name.replace("-", " ");

        if (!channelName.includes(project.appName.toLowerCase())) {
            message.channel.send(`Project is private or not found`);
            return;
        }
    }

    let ownerUsername = await GetProjectOwnerFormattedDiscordUsername(project);

    const messageEmbedFields = [
        { name: "Category", value: project.category },
        { name: "Created", value: project.createdAt.toUTCString() + " UTC" }
    ];

    if (project.downloadLink)
        messageEmbedFields.push({ name: "Download", value: project.downloadLink });

    if (project.githubLink)
        messageEmbedFields.push({ name: "Github", value: project.githubLink });

    if (project.externalLink)
        messageEmbedFields.push({ name: "External Link", value: project.externalLink });

    if (!project || !project.id) return;

    const collaborators = await GetProjectCollaborators(project.id);
    const devs = collaborators.filter(i => i.role == "Developer");
    const devIds = devs.map(i => `<@${i.discordId}>`).join(" ");

    const sanitizedDesc = project.description.replace("*", "\\*").replace("_", "\\_").replace("\\", "\\\\").replace("~", "\\~");

    const messageEmbed: any = {
        title: project.appName,
        image: { url: project.heroImage },
        description: sanitizedDesc + "\n" + "Developers: " + devIds,
        fields: messageEmbedFields,
        timestamp: new Date()
    };


    if (project.appIcon)
        messageEmbed.thumbnail = { url: project.appIcon };

    // TODO: include the app channel if present
    message.channel.send({ embed: messageEmbed });
}

async function findProject(projectName: string, srcChannel: TextChannel): Promise<IProject | undefined> {
    const allProjects = await Project.findAll();

    const matchedProjects = allProjects.filter(i => i.appName.toLowerCase().includes(projectName) || i.appName.toLowerCase() == projectName || projectName.includes(i.appName.toLowerCase()));

    if (!matchedProjects || matchedProjects.length == 0) {
        srcChannel.send(`Project is private or not found.`);
        return;
    }

    if (matchedProjects.length > 1) {
        srcChannel.send(`Multiple projects found, please be more specific`);
        return;
    }

    return DbToStdModal_Project(matchedProjects[0]);
}

async function GetProjectOwnerFormattedDiscordUsername(project: IProject): Promise<string | undefined> {
    let ownerUsername;

    const ownerId = project.collaborators?.find(i => i.isOwner)?.discordId;

    if (ownerId) {
        const ownerUser = await GetUser(ownerId);
        if (ownerUser) {
            ownerUsername = `${ownerUser.username}#${ownerUser.discriminator}`;
            ownerUsername = `<@${ownerUser.id}>`;
        }
    }

    return ownerUsername;
}


async function ReactWithPromiseStatus<T>(promise: Promise<T>, message: Message) {
    const guild = GetGuild();

    await promise
        .then(() => {
            const greencheckEmojiId = guild?.emojis.find(i => i.name == "greencheck").id;
            if (greencheckEmojiId)
                message.react(greencheckEmojiId);
        })
        .catch(err => {
            const reactionId = guild?.emojis.find(i => i.name == "bug").id;
            if (reactionId) message.react(reactionId);

            message.channel.send(err);
        });
}