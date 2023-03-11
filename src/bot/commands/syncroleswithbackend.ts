import { CreateRoleOptions, Message, Role as DiscordRole, TextChannel } from "discord.js";
import { IBotCommandArgument, IProject } from "../../models/types";
import { GetGuild, EditMultiMessages, GetChannelByName, SendMultiMessages, GetGuildMembers, GetRoles } from "../../common/helpers/discord";
import Role, { GetRoleByName } from "../../models/Role";
import UserProject from "../../models/UserProject";
import User, { getUserByDiscordId } from "../../models/User";
import Project, { DbToStdModal_Project, getAllProjects } from "../../models/Project";

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    if (!message.member) return;

    const isAdmin = [...message.member.roles.cache.values()].filter(role => role.name.toLowerCase() === "admin").length != 0;
    if (!isAdmin) return;

    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    if (!botChannel) return;

    const messages = await SendMultiMessages(`Started syncing discord roles and backend database.`, botChannel, message.channel as TextChannel);

    await CreateMissingUserProjectsForDiscordRoles(message);

    /*    await RemoveDiscordRolesForUnregisteredProjects(message);
   
       const missingRoleData = await GetRoleDataIfCreatingMissingRolesDoesntExceedRoleLimit(message);
   
       if (missingRoleData) {
           await CreateMissingDiscordRolesForUserProjects(message, missingRoleData);
       } */

    SendMultiMessages(`Finished syncing discord roles and backend database.`, botChannel, message.channel as TextChannel);
}

async function CreateMissingUserProjectsForDiscordRoles(message: Message) {
    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    if (!botChannel) return;

    const messages = await SendMultiMessages(`Registering missing collaborators based on Discord roles`, botChannel, message.channel as TextChannel);

    // Find all registered projects
    const registeredProjects = await getAllProjects()
        .catch(err => { EditMultiMessages(`Registering missing collaborators based on Discord roles\nError while getting projects: ${err}`, ...messages); });

    if (!registeredProjects || registeredProjects.length == 0) return;

    // For each project
    for (const project of registeredProjects) {
        // Locate the discord role for the UserCollaborator Role type

        await EditMultiMessages(`Registering missing collaborators based on Discord roles\nSyncing project ${project.appName}\n​​`, ...messages);

        for (const role of await getExistingDiscordRolesForProject(project)) {
            // If it exists, find all users with that role type
            const guild = await GetGuild();
            if (!guild) return;

            const members = await GetGuildMembers();
            if (!members)
                continue;

            const usersWithRole = members.filter((member) => member.roles.cache.has(role.id));

            for (const discordUser of usersWithRole) {
                // For each user found, create a new UserProject with the proper roleId
                let dbRole: Role | null = null;

                if (role.name.toLowerCase().includes("dev")) {
                    dbRole = await GetRoleByName("Developer");
                }
                if (role.name.toLowerCase().includes("translator")) {
                    dbRole = await GetRoleByName("Translator");
                }
                if (role.name.toLowerCase().includes("tester")) {
                    dbRole = await GetRoleByName("Beta Tester");
                }

                if (!dbRole) return;

                const user = await getUserByDiscordId(discordUser.id);
                if (!user) {
                    const resultMessage = await botChannel.send(`${discordUser.displayName} had role "${role.name}" on the project "${project.appName}", but isn't registered. Removing role and sending DM.`) as Message;

                    // If the user isn't registered with the community website, remove the role.
                    // send them a DM asking them to register, and then tell them to ask the dev to add them back to the project

                    discordUser.send(`Hello 👋. We attempted to sync your role "${role.name}" for the project "${project.appName}", but it looks like you don't have an account registered with us.\n\nThis role has been removed. You'll need to register on the community website and have a Developer on the project re-add you as a ${dbRole.name}.`);
                    discordUser.roles.remove(role);
                    resultMessage.edit(`${discordUser.displayName}#${discordUser.user.discriminator} had role "${role.name}" on the project "${project.appName}", but isn't registered. Removed role and sent DM.`);
                } else {
                    if (!project.id) continue;
                    const existing = await UserProject.findOne({ where: { userId: user.id, roleId: dbRole.id, projectId: project.id } });

                    if (!existing) {
                        await EditMultiMessages(`Registering missing collaborators based on Discord roles\nSyncing project ${project.appName}\nChecking role ${role.name}\nRegistering ${discordUser.displayName}#${discordUser.user.discriminator} as a ${role.name}`, ...messages);
                        const resultMessage = await botChannel.send(`Registering ${discordUser.displayName}#${discordUser.user.discriminator} as a ${role.name}`) as Message;

                        UserProject.create({
                            userId: user.id,
                            projectId: project.id,
                            isOwner: false,
                            roleId: dbRole.id
                        });

                        resultMessage.edit(`Created a new \`UserProject\` for ${discordUser.displayName}'s "${role.name}" role on the project "${project.appName}"`);
                    }
                }
            }
        }
    }

    await EditMultiMessages(`Finished registering missing collaborators based on Discord roles`, ...messages);
}

/**
 * @summary Check if creating all the missing roles using registered UserProjects in the Database will exceed Discord's role limit
*/
async function GetRoleDataIfCreatingMissingRolesDoesntExceedRoleLimit(message: Message, limit: number = 240): Promise<IDiscordRoleData[]> {
    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    if (!botChannel) return [];

    const returnData: IDiscordRoleData[] = [];

    const messages = await SendMultiMessages(`Checking if creating missing Discord roles would exceed role limit of ${limit}...`, message.channel as TextChannel, botChannel);

    await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nFinding all UserProjects...`, ...messages);

    const userProjects = await UserProject.findAll({ include: [{ model: User }, { model: UserProject }, { model: Role }, { model: Project }] });

    const guild = await GetGuild();
    if (!guild) return [];

    const roles = [...guild.roles.cache.values()];
    if (!roles) return [];

    // Assuming the unused discord roles are cleaned up
    // Count how many roles don't need to be created
    const userProjectsUniqueByProjectAndRole: UserProject[] = [];

    await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nPreparing data...`, ...messages);
    // Filtered as if the database table was Unique by project and role, but not users
    for (const userProject of userProjects) {
        const projectRoleAdded: boolean = userProjectsUniqueByProjectAndRole.find(x => x.roleId == userProject.roleId && x.projectId == userProject.projectId) != null;

        if (!projectRoleAdded) {
            userProjectsUniqueByProjectAndRole.push(userProject);
        }
    }

    // Count how many roles need to be created
    await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nDiscovering roles that need to be created...`, ...messages);
    const rolesToBeCreated: UserProject[] = [];

    for (const userProject of userProjectsUniqueByProjectAndRole) {
        const currentIndex = userProjectsUniqueByProjectAndRole.findIndex(x => userProject.id == x.id);

        const role = userProject.role;
        if (!role) continue;

        await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nDiscovering roles that need to be created... (${currentIndex} of ${userProjects.length})\n\n${role.name} role on project #${userProject.id}:\nGetting project data`, ...messages);

        // Get the related project
        const dbProject = await Project.findOne({ where: { id: userProject.projectId } });
        if (!dbProject) continue;

        await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nDiscovering roles that need to be created... (${currentIndex} of ${userProjects.length})\n\n${role.name} role on ${dbProject.appName}:\nGetting expected discord role name`, ...messages);

        // Get expected name of the discord role for the project
        const project = await DbToStdModal_Project(dbProject);
        const expectedDiscordRoleName = DbToDiscordRoleName(role.name, project.appName);

        await EditMultiMessages(`Checking if creating missing Discord roles would exceed role limit...\nDiscovering roles that need to be created... (${currentIndex} of ${userProjects.length})\n\n${role.name} role on ${dbProject.appName}:\nChecking if the discord role "${expectedDiscordRoleName}" exists.`, ...messages);

        // If the discord role for this project/role doesn't exist
        const indexOfExistingRole = roles.findIndex(x => x.name == expectedDiscordRoleName);

        if (indexOfExistingRole != -1) {
            rolesToBeCreated.splice(indexOfExistingRole, 1);
        } else {
            if (expectedDiscordRoleName) {
                returnData.push({
                    name: expectedDiscordRoleName,
                    color: project.accentColor,
                    hoist: false,
                    position: await getPositionForRole(role, project),
                    mentionable: true
                });
            }
        }
    }

    const isSafe = (rolesToBeCreated.length + roles.length) < limit;

    await EditMultiMessages(`Finished checking if creating missing Discord roles would exceed role limit of ${limit}. (${isSafe ? "Is safe" : "Not safe"})`, ...messages);

    if (isSafe) {
        return returnData;
    } else {
        SendMultiMessages(`Unable to create missing Discord roles for registered \`UserProject\`s. Role ceiling would be reached.`, message.channel as TextChannel, botChannel);
        return [];
    }
}

async function CreateMissingDiscordRolesForUserProjects(message: Message, discordRoleData: CreateRoleOptions[]) {
    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    if (!botChannel) return;

    const messages = await SendMultiMessages(`Creating missing Discord roles for registered \`UserProject\`s`, message.channel as TextChannel, botChannel);

    const guild = await GetGuild();

    // For each existing UserProject
    for (const roleData of discordRoleData) {
        EditMultiMessages(`Creating missing Discord roles for registered project collaborators\nCreating the role ${roleData.name}`, ...messages);

        await guild?.roles.create(roleData);
    }

    EditMultiMessages(`Finished creating missing Discord roles for registered project collaborators`, ...messages);
}

async function RemoveDiscordRolesForUnregisteredProjects(message: Message) {
    // Remove all discord roles which aren't registered in the Database
    const guild = await GetGuild();

    const botChannel = await GetChannelByName("bot-stuff") as TextChannel;
    if (!botChannel) return;

    const messages = await SendMultiMessages(`Cleaning up Discord roles for unregistered projects`, botChannel, message.channel as TextChannel);

    const roles = await GetRoles();
    if (!roles) return [];

    const rolesRegex = [
        (/Beta Tester \((.+)\)/),
        (/Translator \((.+)\)/),
        (/(.+) Dev/)
    ];

    for (const regex of rolesRegex) {
        // Find all discord roles of each Role type
        for (const role of roles) {
            if (role.name == "everyone") continue;

            const matchingRoles = Array.from(role.name.matchAll(regex));
            if (!matchingRoles || matchingRoles.length === 0)
                continue;

            await EditMultiMessages(`Cleaning up Discord roles for unregistered projects\nChecking role ${role.name}\n​`, ...messages);

            // Match each found role to a registered project
            const appName = (matchingRoles[0] as any)[1];

            await EditMultiMessages(`Cleaning up Discord roles for unregistered projects\nChecking role ${role.name}\nFinding registered project for "${appName}"`, ...messages);

            const matchedProject = await Project.findOne({ where: { appName: appName } });

            // If there is no registered project, delete the role
            if (!matchedProject) {
                await EditMultiMessages(`Cleaning up Discord roles for unregistered projects\nChecking role ${role.name}\n${appName} is not registered, role "${role.name}" will be deleted`, ...messages);

                botChannel.send(`Discord Role "${role.name}" has not been registered and will be deleted.`);
                await role.delete("Project not registered in database");
            }
        }
    }

    await EditMultiMessages(`Finished cleaning up Discord roles for unregistered projects`, ...messages);
}

async function getPositionForRole(role: Role, project: IProject): Promise<number | undefined> {
    const roles = await GetRoles();
    if (!roles) return undefined;

    switch (role.name) {
        case "Developer":
            // If the role has a color, it should go above the Designer and Developer roles so that user has their color in chat
            if (project.accentColor) {
                let devPosition = roles.findIndex(i => i.name.toLowerCase() === "developer");
                let designerPosition = roles.findIndex(i => i.name.toLowerCase() === "designer");

                // If neither position can be found, bail out and use default position 
                if (devPosition == -1 && designerPosition == -1)
                    return undefined;

                // If either role position isn't found, just use the other one
                if (devPosition == -1)
                    devPosition = designerPosition;

                if (designerPosition == -1)
                    designerPosition = devPosition;

                const newPosition = Math.min(devPosition, designerPosition) - 1;
                return newPosition;
            }
            // If the role has no color, it should go below the Beta Tester and Translator roles (again, to retain color in chat)
            else {
                const testerRole = roles.filter(x => x.name.includes("Beta Tester (")).reduceRight(x => x);
                let lastTesterPosition = testerRole ? roles.lastIndexOf(testerRole) : -1;

                const translatorRole = roles.filter(x => x.name.includes("Translator (")).reduceRight(x => x);
                let lastTranslatorPosition = translatorRole ? roles.lastIndexOf(translatorRole) : -1;

                // If neither position can be found, bail out and use default position
                if (lastTranslatorPosition == -1 && lastTesterPosition == -1)
                    return undefined;

                // If either role position isn't found, just use the other one
                if (lastTranslatorPosition == -1)
                    lastTranslatorPosition = lastTesterPosition;

                if (lastTesterPosition == -1)
                    lastTesterPosition = lastTranslatorPosition;

                const newPosition = Math.max(lastTranslatorPosition, lastTesterPosition) - 1;
                return newPosition;
            }
        case "Translator":
            const translatorRole = roles.filter(x => x.name.includes("Translator (")).reduceRight(x => x);
            let lastTranslatorPosition = translatorRole ? roles.lastIndexOf(translatorRole) : -1

            if (lastTranslatorPosition == -1)
                return undefined;

            return lastTranslatorPosition + 1;
        case "Beta Tester":
            const testerRole = roles.find(r => r.name === "Beta Tester");
            let lastTesterPosition = testerRole ? roles.lastIndexOf(testerRole) : -1;

            if (lastTesterPosition == -1)
                return undefined;

            return lastTesterPosition + 1;
    }

}

async function getExistingDiscordRolesForProject(project: IProject): Promise<DiscordRole[]> {
    const roles = await GetRoles();
    if (!roles) return [];

    const rolesRegex = [
        (/Beta Tester \((.+)\)/),
        (/Translator \((.+)\)/),
        (/(.+) Dev/)
    ];

    const results = [];

    for (const regex of rolesRegex) {
        // Filter out all the roles that don't match one of the regex patterns above
        // The first match should be the role that both matches the regex and contains the app name. There can be only one.

        const result = roles.filter(role => {
            const matchingRoles = Array.from(role.name.matchAll(regex));
            if (!matchingRoles || matchingRoles.length === 0)
                return false;

            const appName = matchingRoles[0][1]?.toLowerCase();
            return project.appName.toLowerCase().includes(appName);
        })[0];

        if (result) results.push(result);
    }

    return results;
}

/**
 * @param dbRoleName Name of the database role
 * @returns {string} The name of the matching discord role, if it exists
 */
function DbToDiscordRoleName(dbRoleName: string, projectName: string): string | undefined {
    switch (dbRoleName) {
        case "Beta Tester":
            return `Beta Tester (${projectName})`;
        case "Developer":
            return `${projectName} Dev`;
        case "Translator":
            return `Translator (${projectName})`;
        default: undefined;
    }
}

interface IDiscordRoleData {
    name: string;
    color?: string;
    hoist: boolean;
    position?: number;
    mentionable: boolean;
}