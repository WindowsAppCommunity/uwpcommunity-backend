import { Request, Response } from "express";
import { genericServerError, validateAuthenticationHeader, match } from "../../common/generic.js";
import { GetDiscordIdFromToken } from "../../common/discord.js";
import { BuildResponse, HttpStatus, } from "../../common/responseHelper.js";
import projects, { GetProjectsByDiscordId, SaveProjectAsync } from "../sdk/projects.js";
import { IProject } from "../sdk/interface/IProject.js";
import { CreateLibp2pKey, Dag, Helia, Ipns } from "../sdk/helia.js";

export default async (req: Request, res: Response) => {
    const body = req.body as IProject;

    body.images == body.images ?? [];

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess)
        return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId)
        return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    if (projects.filter(x => x.project.name == body.name).length > 0) {
        BuildResponse(res, HttpStatus.MalformedRequest, `A project with that name already exists`);
        return;
    }

    var userOwnedProjects = await GetProjectsByDiscordId(discordId, authAccess);
    if (userOwnedProjects.length > 15) {
        BuildResponse(res, HttpStatus.MalformedRequest, `User has reached or exceeded project limit`);
        return;
    }
    
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    body.needsManualReview = true;

    var ipnsKey = await CreateLibp2pKey();
    await SaveProjectAsync(ipnsKey.toCID(), body);
};

function checkBody(body: IProject): true | string {
    if (!body.name) return "name";
    if (!body.description) return "description";
    if (!body.category) return "category";
    if (!body.heroImage) return "heroImage";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}
