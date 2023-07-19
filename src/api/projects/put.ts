import { Request, Response } from "express";
import { validateAuthenticationHeader } from '../../common/generic.js';
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/discord.js";
import { BuildResponse, HttpStatus } from "../../common/responseHelper.js";
import { IProject } from "../../sdk/interface/IProject.js";
import { GetUserByDiscordId } from "../../sdk/users.js";
import { GetIpnsCidByProjectName, GetProjectByName, SaveProjectAsync } from "../../sdk/projects.js";

export default async (req: Request, res: Response) => {
    const body = req.body as IProject;

    body.images == body.images ?? [];

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    if (!req.query['appName']) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Query string "${'appName'}" not provided or malformed`);
        return;
    }

    const bodyCheck = checkIProject(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    var appName = decodeURIComponent(req.query['appName'].toString());
    var projectUpdateRequest = body;

    const project = await GetProjectByName(appName);
    if (!project) {
        BuildResponse(res, HttpStatus.NotFound, `Project with name "${appName}" could not be found.`);
        return;
    }

    const guildMember = await GetGuildUser(discordId);
    const isMod = guildMember && [...guildMember.roles.cache.values()].filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0;

    const userMap = await GetUserByDiscordId(discordId);
    if (!userMap) {
        BuildResponse(res, HttpStatus.NotFound, `User with discord id "${discordId}" could not be found.`);
        return;
    }

    const userOwnsProject = !!project?.collaborators.filter(x => x.role.name.toLowerCase() == "owner" && x.user == userMap.ipnsCid);
    const userCanModify = userOwnsProject || isMod;

    if (!userCanModify) {
        BuildResponse(res, HttpStatus.Unauthorized, `User with discord id "${discordId}" is not authorized to modify this project.`);
        return;
    }

    if (project.needsManualReview && !projectUpdateRequest.needsManualReview) {
        if (!isMod) {
            BuildResponse(res, HttpStatus.Unauthorized, `User with discord id "${discordId}" is not authorized to modify review state.`);
            return;
        }
    }

    var ipnsCid = await GetIpnsCidByProjectName(appName);
    if (!ipnsCid) {
        BuildResponse(res, HttpStatus.NotFound, `IPNS for project with name "${appName}" could not be found.`);
        return;
    }

    await SaveProjectAsync(ipnsCid, projectUpdateRequest)
};

function checkIProject(body: IProject): true | string {
    if (!body.name) return "name";
    if (!body.description) return "description";
    if (body.isPrivate === undefined) return "isPrivate";
    if (body.needsManualReview === undefined) return "needsManualReview";

    return true;
}