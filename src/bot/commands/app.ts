import { IBotCommandArgument, IProject } from "../../models/types";
import { Message, TextChannel, Role, User, GuildMember } from "discord.js";
import Project, { findSimilarProjectName, DbToStdModal_Project } from "../../models/Project";
import { GetUser, GetGuildRoles, GetDiscordUser, GetGuild } from "../../common/helpers/discord";

const greencheckEmojiId = "721171548534341652";

// This architecture here works a bit different than other places. 
// Instead of validating all arguments at the start of the command in the default function, then having to do the rest in thise scope
// We validate the required parameters first, then move to handleProjectCommand and pass the project, original message, and command arguments in
// This way, each command variation has its own function and argument scope, and things are kept clean 

export default async (discordMessage: Message, commandParts: string[], args: IBotCommandArgument[]) => {

    const projectName = commandParts[0].toLowerCase();
    if (!projectName) {
        discordMessage.channel.send(`No project name provided`);
        return;
    }

    const project = await findProject(projectName, discordMessage.channel as TextChannel);
    if (!project)
        return;

    await handleProjectCommand(project, discordMessage, commandParts, args);

    // TODO:
    // List projects for a user (!getuser apps)
    // Give other users roles


};

async function handleProjectCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
    if (!commandParts[1]) {
        // Todo: List out possible commands
        message.channel.send(`What about it?`);
        return;
    }

    switch (commandParts[1]) {
        case "details":
            await (getProjectDetails as any)(...arguments);
            break;
        case "user":
            await (handleUserCommand as any)(...arguments);
            break;
        default:
            message.channel.send(`Unknown command "${commandParts[1]}"`);
    }
}

async function handleUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {

    switch (commandParts[2]) {
        case "add":
            await (handleAddUserCommand as any)(...arguments);
            break;
        case "remove":
            await (handleRemoveUserCommand as any)(...arguments);
            break;
        default:
            message.channel.send(`Unknown command. Valid commands for managing users are "add" and "remove"`);
    }
}

async function handleAddUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
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


    // Need to add existing users to database
    // And remove the roles for users that aren't registered on the website

    if (!userCanModify) {
        message.channel.send(`Only devs or the project owner can add new users`);
        return;
    }

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a user type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
        return;
    }

    if (!isOwner && typeArg.value == "dev") {
        message.channel.send(`Only the project owner can manage devs on this project.`);
        return;
    }

    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    if (!userArg) {
        message.channel.send(`Please specify a username or discordId\nExample: \`/discordId 714896135382368340\` or \`/username Panos#0309\``);
        return;
    }

    const desiredRole: Role | undefined = await (getRoleForProject as any)(...arguments);
    if (!desiredRole) {
        message.channel.send(`No ${typeArg.value} role found for ${project.appName}`);
        return;
    }

    let user: GuildMember | undefined;
    const guild = GetGuild();

    // Get target user
    switch (userArg.name) {
        case "username":
            user = guild?.members.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value)
            break;
        case "discordId":
            user = guild?.members.find(m => m.user.id === userArg.value)
            break;
        default:
            message.channel.send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (user) {
        user.addRole(desiredRole)
            .then(() => {
                const greencheckEmojiId = guild?.emojis.find(i => i.name == "greencheck").id;
                if (greencheckEmojiId)
                    message.react(greencheckEmojiId);
            })
            .catch((err) => {
                const reactionId = guild?.emojis.find(i => i.name == "bug").id;
                if (reactionId)
                    message.react(reactionId);
            });
    }
}


async function handleRemoveUserCommand(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]) {
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


    if (!userCanModify) {
        message.channel.send(`Only devs or the project owner can remove users`);
        return;
    }

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a user type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
        return;
    }

    if (!isOwner && typeArg.value == "dev") {
        message.channel.send(`Only the project owner can manage devs on this project. `);
        return;
    }

    const userArg = args.find(arg => arg.name == "username" || arg.name == "discordId");
    if (!userArg) {
        message.channel.send(`Please specify a username or discordId\nExample: \`/discordId 714896135382368340\` or \`/username Panos#0309\``);
        return;
    }

    const desiredRole: Role | undefined = await (getRoleForProject as any)(...arguments);
    if (!desiredRole) {
        message.channel.send(`No ${typeArg.value} role found for ${project.appName}`);
        return;
    }

    let user: GuildMember | undefined;
    const guild = GetGuild();

    // Get target user
    switch (userArg.name) {
        case "username":
            user = guild?.members.find(m => `${m.user.username}#${m.user.discriminator}` === userArg.value)
            break;
        case "discordId":
            user = guild?.members.find(m => m.user.id === userArg.value)
            break;
        default:
            message.channel.send(`Unknown user identifier. (You shouldn't be seeing this)`);
            return;
    }

    if (user) {
        await user.removeRole(desiredRole);
        const greencheckEmojiId = guild?.emojis.find(i => i.name == "greencheck").id;
        if (greencheckEmojiId)
            message.react(greencheckEmojiId);
    }
}

async function getRoleForProject(project: IProject, message: Message, commandParts: string[], args: IBotCommandArgument[]): Promise<Role | undefined> {
    const roles = await GetGuildRoles();

    const typeArg = args.find(arg => arg.name == "type");
    if (!typeArg) {
        message.channel.send(`Please specify a user type argument. Valid values are \`tester\`, \`translator\`, and \`dev\`\nExample: \`/type translator\``);
        return;
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
            return undefined;
    }

    return roles?.find(role => {
        const matchingRoles = Array.from(role.name.matchAll(appNameInRoleRegex));
        if (!matchingRoles || matchingRoles.length === 0) return false;

        const appName = matchingRoles[0][1]?.toLowerCase();
        return project.appName.toLowerCase().includes(appName);
    });
}


async function getProjectDetails(project: IProject, message: Message) {
    // Make sure the details are being sent to the project channel if private
    if (project.isPrivate) {
        const channelName: string = (message.channel as TextChannel).name.replace("-", " ");

        if (!channelName.includes(project.appName.toLowerCase()))
            return;
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



    const messageEmbed = {
        title: project.appName,
        author: {
            name: ownerUsername
        },
        image: { url: project.heroImage },
        description: project.description.replace("*", "\\*").replace("_", "\\_").replace("\\", "\\\\").replace("~", "\\~"),
        fields: messageEmbedFields,
        timestamp: new Date()
    }

    // TODO: include the app channel if present
    message.channel.send({ embed: messageEmbed });
}


async function findProject(projectName: string, srcChannel: TextChannel): Promise<IProject | undefined> {
    const allProjects = await Project.findAll();

    const matchedProjects = allProjects.filter(i => i.appName.toLowerCase().includes(projectName) || i.appName.toLowerCase() == projectName || projectName.includes(i.appName.toLowerCase()));

    if (!matchedProjects || matchedProjects.length == 0) {
        const similarAppName = findSimilarProjectName(allProjects, projectName, 2);

        let notFoundMsg = `Project not found.`;
        if (similarAppName)
            notFoundMsg += `Did you mean ${similarAppName}?`;

        srcChannel.send(notFoundMsg);
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
        if (ownerUser)
            ownerUsername = `${ownerUser.username}#${ownerUser.discriminator}`;
    }

    return ownerUsername;
}
