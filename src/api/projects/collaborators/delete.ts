import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../../models/User"
import { getAllProjects } from "../../../models/Project";
import { genericServerError, validateAuthenticationHeader } from '../../../common/helpers/generic';
import { IProject } from "../../../models/types";
import { GetDiscordIdFromToken, GetGuildMembers, GetGuildUser, GetRoles } from "../../../common/helpers/discord";
import { BuildResponse, HttpStatus, ResponsePromiseReject, IRequestPromiseReject } from "../../../common/helpers/responseHelper";
import UserProject, { GetProjectCollaborators, GetProjectsByUserId } from "../../../models/UserProject";
import { GuildMember, Role } from "discord.js";
import { GetRoleByName } from "../../../models/Role";
import { Sequelize } from "sequelize-typescript";

module.exports = async (req: Request, res: Response) => {
    const body = req.body as IDeleteProjectCollaboratorRequestBody;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Query string "${bodyCheck}" not provided or malformed`);
        return;
    }

    var callerUser = await GetGuildUser(discordId);
    if (!callerUser) return;

    const user = await User.findOne({
        where: Sequelize.or(
            { id: body.userId ?? -1 },
            { discordId: body.discordId ?? -1 })
    }).catch(err => { BuildResponse(res, HttpStatus.NotFound, "User not found") });

    if (!user) {
        BuildResponse(res, HttpStatus.BadRequest, `User isn't registered with the UWP Community.`);
        return;
    }

    const contributorRole = await GetRoleByName(body.role);
    if (!contributorRole) {
        BuildResponse(res, HttpStatus.BadRequest, `Role not found.`);
        return;
    }

    var collaborators = await GetProjectCollaborators(body.projectId);

    const isOwner = collaborators.find(collaborator => collaborator.isOwner)?.discordId == discordId;
    const isCollaborator = collaborators.find(collaborator => collaborator.discordId == discordId);
    const isMod = callerUser.roles.cache.find(i => i.name.toLowerCase() == "mod" || i.name.toLowerCase() == "admin");

    const isLead = isCollaborator && await UserHasDbRole(body.projectId, discordId, "Lead");
    const isSupport = isCollaborator && await UserHasDbRole(body.projectId, discordId, "Support");
    const isDev = isCollaborator && await UserHasDbRole(body.projectId, discordId, "Developer");

    const userCanModify = isOwner || isLead || isSupport || isDev || isMod || user.discordId?.toString() == discordId;
    const userCanModifyDevs = isOwner || isLead || isSupport || isMod;
    const userCanModifyLead = isOwner || isMod;

    if (!userCanModify || contributorRole.name == "Developer" && !userCanModifyDevs || contributorRole.name == "Lead" && !userCanModifyLead) {
        BuildResponse(res, HttpStatus.Unauthorized, "You don't have permission to modify this project");
        return;
    }

    if (isOwner) {
        BuildResponse(res, HttpStatus.BadRequest, `Project owners cannot be removed. To remove the owner, transfer ownership or delete the project.`);
        return;
    }

    const guildMembers = await GetGuildMembers();
    var discordUser = guildMembers?.find(m => m.user.id === user.discordId);
    if (!discordUser) {
        BuildResponse(res, HttpStatus.InternalServerError, `User data found but user isn't in the discord server. Please contact an administrator to correct the issue.`);
        return;
    }

    const RelevantUserProjects: void | UserProject[] = await UserProject.findAll({ where: { projectId: body.projectId, userId: user.id, roleId: contributorRole.id } }).catch((err: IRequestPromiseReject) => { BuildResponse(res, err.status, err.reason) });
    if (!RelevantUserProjects)
        return;

    const project = await getProjectById(body.projectId, res);

    const desiredRole: void | Role = await getRoleForProject(project, body.role).catch((err) => { BuildResponse(res, HttpStatus.NotFound, err) });
    if (!desiredRole) return;

    await Promise.all([
        safeRemoveRole(desiredRole, discordUser),
        RelevantUserProjects[0].destroy(),
    ])
        .catch(err => genericServerError(err, res))
        .then(() => BuildResponse(res, HttpStatus.Success));
};

export function getProjectById(projectId: number, res: Response): Promise<IProject> {
    return new Promise(async (resolve, reject) => {

        var projects: IProject[] = await getAllProjects().catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, reject));

        if (!projects)
            return;

        projects = projects.filter(x => x.id === projectId);

        resolve(projects[0]);
    });
}
async function UserHasDbRole(projectId: number, userDiscordId: string, roleName: string): Promise<boolean> {
    const role = await GetRoleByName(roleName);
    if (!role)
        return false;

    const user = await getUserByDiscordId(userDiscordId);
    if (!user)
        return false;

    const projects = await GetProjectsByUserId(user.id);
    if (!projects || projects.length === 0)
        return false;

    const relevantProject = projects.filter(x => x.id == projectId)[0];

    if (!relevantProject)
        return false;

    const roleExists = await UserProject.findOne({ where: { roleId: role.id, userId: user.id, projectId: relevantProject.id } });

    return !!roleExists;
}

/**
 * @returns Role if a discord role is found. Undefined if no matching discord role is found. Null if the role was never searched for (usually because of some handled error).
 */
async function getRoleForProject(project: IProject, roleName: string): Promise<Role> {
    const roles = await GetRoles();

    // Should be a regex that captures one group (the app name)
    let appNameInRoleRegex: RegExp;

    switch (roleName) {
        case "tester":
        case "Beta Tester":
            appNameInRoleRegex = /Beta Tester \((.+)\)/;
            break;
        case "translator":
        case "Translator":
            appNameInRoleRegex = /Translator \((.+)\)/;
            break;
        case "dev":
        case "Dev":
        case "Developer":
            appNameInRoleRegex = /(.+) Dev/;
            break;
        case "advocate":
        case "Advocate":
            appNameInRoleRegex = /(.+) Advocate/;
            break;
        case "support":
        case "Support":
            appNameInRoleRegex = /(.+) Support/;
            break;
        case "lead":
        case "Lead":
            appNameInRoleRegex = /(.+) Lead/;
            break;
        case "patreon":
        case "Patreon":
            appNameInRoleRegex = /(.+) Patreon/;
            break;
        default:
            return Promise.reject(`${roleName} is not a valid role type. Expected \`tester\`, \`translator\`, \`dev\`, \`advocate\`, \`support\`, \`lead\`, or \`patreon\``);
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
        return Promise.reject(`No ${roleName} role was found for ${project.appName}.`);
    }

    return matchedRoles?.shift() ?? Promise.reject("Not found");
}

function checkBody(body: IDeleteProjectCollaboratorRequestBody): true | string {
    if (!body.projectId) return "projectId";

    if (!body.userId && !body.discordId)
        return "userId\" or \"discordId";

    if (!body.role) return "role";
    return true;
}

function safeRemoveRole(role: Role | undefined, discordUser: GuildMember) {
    if (role)
        discordUser.roles.remove(role);
}

interface IDeleteProjectCollaboratorRequestBody {
    projectId: number;
    userId?: number;
    discordId?: number;
    role: string;
}
