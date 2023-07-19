import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../common/generic.js";
import { GetDiscordIdFromToken } from "../../common/discord.js";
import { HttpStatus, BuildResponse } from "../../common/responseHelper.js";
import { DeleteProject, GetIpnsCidByProjectName, GetProjectsByDiscordId } from "../../sdk/projects.js";
import type { CID } from "multiformats/cid";

export default async (req: Request, res: Response) => {
    const bodyCheck = checkBody(req.body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Query string "${bodyCheck}" not provided or malformed`);
        return;
    }

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    var modifiableProjects = await GetProjectsByDiscordId(authAccess, discordId);

    for (var project of modifiableProjects) {
        var ipnsCid = GetIpnsCidByProjectName(project.name);
        
        if (ipnsCid == req.body.id) {
            await DeleteProject(req.body.id);
        }
    }
}

function checkBody(body: IDeleteProjectsRequestBody): true | string {
    if (!body.id) return "id";
    return true;
}


interface IDeleteProjectsRequestBody {
    id: CID;
}