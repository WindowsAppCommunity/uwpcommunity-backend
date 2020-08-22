import { Message, Role as DiscordRole } from "discord.js";
import { IBotCommandArgument, IProject } from "../../models/types";
import { getAllProjects } from "../../api/projects/get";
import { GetGuild } from "../../common/helpers/discord";
import Role, { GetRoleByName, GetRoleById } from "../../models/Role";
import UserProject from "../../models/UserProject";
import { getUserByDiscordId } from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    // Todo: don't forget to add project's new accentColor field to the backend project API

    await CreateMissingUserProjectsForDiscordRoles(message);

    await RemoveDiscordRolesForUnregisteredProjects(message);

    const canCreateMissingRoles = await CheckIfCreatingMissingDiscordRolesWillExceedRoleLimit();

    if (canCreateMissingRoles) {
        await CreateMissingDiscordRolesForUserProjects(message);
    } else {
        message.channel.send(`Unable to create missing Discord roles for registered (and used) \`UserProject\`s. Role ceiling would be reached.`);
    }
}

async function CreateMissingUserProjectsForDiscordRoles(message: Message) {
    message.channel.send(`Creating missing \`UserProjects\` for users with projects-related roles`);

    // Find all registered projects
    const registeredProjects = await getAllProjects();

    // For each project
    for (const project of registeredProjects) {
        // Locate the discord role for the UserCollaborator Role type

        for (const role of await getExistingDiscordRolesForProject(project)) {
            // If it exists, find all users with that role type
            const guild = GetGuild();
            if (!guild) return;

            const usersWithRole = (await guild.fetchMembers()).members.filter((member) => member.roles.has(role.id)).array();

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
                    // If the user isn't registered with the community website, remove the role.
                    // send them a DM asking them to register, and then tell them to ask the dev to add them back to the project

                    discordUser.sendMessage(`Hi there. We attempted to sync your project related Discord roles for ${project.appName}, but it looks like your account isn't registered with us.\n\nThe role ${role.name} has been removed, you'll need to register on the community website and have a Developer on the project re-add you as a ${dbRole.name}`);
                    discordUser.removeRole(role);

                } else {
                    UserProject.create({
                        userId: user.id,
                        projectId: project.id,
                        isOwner: false,
                        roleId: dbRole.id
                    });
                }
            }
        }
    }
}

/**
 * @summary Check if creating all the missing roles using registered UserProjects in the Database will exceed Discord's role limit
*/
async function CheckIfCreatingMissingDiscordRolesWillExceedRoleLimit(limit: number = 250): Promise<boolean> {
    const userProjects = await UserProject.findAll();
    const guild = GetGuild();
    const roles = guild?.roles.array();
    if (!roles) return true;
    // Assuming the unused discord roles are cleaned up

    // Count how many roles don't need to be created
    const userProjectsUniqueByProjectAndRole: UserProject[] = [];

    // Filtered as if the database table was Unique by project and role, but not users
    for (const userProject of userProjects) {
        const projectRoleAdded: boolean = userProjectsUniqueByProjectAndRole.find(x => x.roleId == userProject.roleId && x.projectId == userProject.projectId) != null;

        if (!projectRoleAdded) {
            userProjectsUniqueByProjectAndRole.push(userProject);
        }
    }

    // Count how many roles need to be created
    const rolesToBeCreated: UserProject[] = [];

    for (const userProject of userProjects) {
        const role = await GetRoleById(userProject.roleId);
        if (!role) continue;

        // Get the related project
        const dbProject = await Project.findOne({ where: { id: userProject.projectId } });
        if (!dbProject) continue;

        // Get expected name of the discord role for the project
        const project = await DbToStdModal_Project(dbProject);
        const expectedDiscordRoleName = DbToDiscordRoleName(role.name, project.appName);

        // If the discord role for this project/role doesn't exist
        if (getExistingDiscordRolesForProject(project).findIndex(i => i.name == expectedDiscordRoleName) != -1) {
            const indexOfExistingRole = roles.findIndex(x => x.name == expectedDiscordRoleName);

            if (indexOfExistingRole != -1) {
                rolesToBeCreated.splice(indexOfExistingRole, 1);
            }
        }
    }

    return (rolesToBeCreated.length - userProjectsUniqueByProjectAndRole.length) > limit;
}

async function CreateMissingDiscordRolesForUserProjects(message: Message) {
    message.channel.send(`Creating missing Discord roles for registered (and used) \`UserProject\`s`)

    // For each existing user project
    const userProjects = await UserProject.findAll();
    const guild = GetGuild();

    // For each existing UserProject
    for (const userProject of userProjects) {
        const role = await GetRoleById(userProject.roleId);
        if (!role) continue;

        // Get the related project
        const dbProject = await Project.findOne({ where: { id: userProject.projectId } });
        if (!dbProject) continue;

        // Get expected name of the discord role for the project
        const project = await DbToStdModal_Project(dbProject);
        const expectedDiscordRoleName = DbToDiscordRoleName(role.name, project.appName);

        // If the discord role for this project/role doesn't exist
        const existingRoles = getExistingDiscordRolesForProject(project);
        if (existingRoles.filter(i => i.name == expectedDiscordRoleName).length == 0) {
            // Create the missing discord role

            message.channel.send(`Creating the role ${expectedDiscordRoleName}`);

            await guild?.createRole({
                name: expectedDiscordRoleName,
                color: project.accentColor,
                hoist: false,
                position: getPositionForRole(role, project),
                mentionable: true
            });
        }
    }
}

async function RemoveDiscordRolesForUnregisteredProjects(message: Message) {
    // Remove all discord roles which aren't registered in the Database
    message.channel.send(`Cleaning up Discord roles for unregistered projects`);
    const guild = GetGuild();

    const roles = guild?.roles.array();
    if (!roles) return [];

    const rolesRegex = [
        (/Beta Tester \((.+)\)/),
        (/Translator \((.+)\)/),
        (/(.+) Dev/)
    ];

    for (const regex of rolesRegex) {
        // Find all discord roles of each Role type
        for (const role of roles) {
            const matchingRoles = Array.from(role.name.matchAll(regex));
            if (!matchingRoles || matchingRoles.length === 0)
                return false;

            // Match each found role to a registered project
            const appName = matchingRoles[0][1]?.toLowerCase();
            const matchedProject = await Project.findOne({ where: { name: appName } });

            // If there is no registered project, delete the role
            if (!matchedProject) {
                message.channel.send(`Discord Role "${role.name}" has not been registered and will be deleted.`);
                await role.delete("Project not registered in database");
            }
        }

    }
}

function getPositionForRole(role: Role, project: IProject): number | undefined {
    const guild = GetGuild();
    const roles = guild?.roles.array();
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
                const testerRole = roles.find(r => r.name === "Beta Tester");
                let lastTesterPosition = testerRole ? roles.lastIndexOf(testerRole) : -1;

                const translatorRole = roles.find(r => r.name === DbToDiscordRoleName(role.name, project.appName));
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
            const translatorRole = roles.find(r => r.name === DbToDiscordRoleName(role.name, project.appName));
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

function getExistingDiscordRolesForProject(project: IProject): DiscordRole[] {
    const guild = GetGuild();

    const roles = guild?.roles.array();
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

        results.push(roles.filter(role => {
            const matchingRoles = Array.from(role.name.matchAll(regex));
            if (!matchingRoles || matchingRoles.length === 0)
                return false;

            const appName = matchingRoles[0][1]?.toLowerCase();
            return project.appName.toLowerCase().includes(appName);
        })[0]);
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