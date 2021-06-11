import { Request, Response } from "express";
import Project, { DbToStdModal_Project, getAllProjects } from "../../models/Project";
import { IProject } from "../../models/types";
import { validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectsRequestQuery;

    var isMod = await checkIsMod(req, res);
    const projects = await getAllProjectsApi(reqQuery.all && isMod).catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
    if (projects) {
        BuildResponse(res, HttpStatus.Success, projects);
    }
};

async function checkIsMod(req: Request, res: Response): Promise<boolean> {
    const authAccess = validateAuthenticationHeader(req, res, false);
    if (authAccess) {
        const discordId = await GetDiscordIdFromToken(authAccess, res, false);
        if (!discordId) return false;

        const user = await GetGuildUser(discordId);
        if (!user) return false;
        return user.roles.cache.array().filter(role => role.name == "Mod" || role.name == "Admin").length > 0;
    }
    return false;
}

export async function getAllProjectsApi(all?: boolean): Promise<IProject[]> {

    let allProjects = await getAllProjects(undefined, true).catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, Promise.reject));

    if (all !== true)
        allProjects = (allProjects as IProject[]).filter(x => x.needsManualReview == false && x.isPrivate == false);

    return allProjects;
}

interface IGetProjectsRequestQuery {
    /** @summary Only useable if user is a mod or admin */
    all?: boolean;
}
