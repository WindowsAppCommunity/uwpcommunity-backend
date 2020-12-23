import { Request, Response } from "express";
import Project, { DbToStdModal_Project, getAllProjects } from "../../models/Project";
import { IProject } from "../../models/types";
import { validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectsRequestQuery;

    const projects = await getAllProjectsApi(reqQuery.all && await isMod(req, res)).catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
    if (projects) {
        BuildResponse(res, HttpStatus.Success, projects);
    }
};

async function isMod(req: Request, res: Response): Promise<boolean> {
    const authAccess = validateAuthenticationHeader(req, res, false);
    if (authAccess) {
        const discordId = await GetDiscordIdFromToken(authAccess, res, false);
        if (!discordId) return false;

        const user = await GetGuildUser(discordId);
        if (!user) return false;
        return user.roles.cache.filter(role => role.name == "Mod" || role.name == "Admin").array.length > 0;
    }
    return false;
}

export async function getAllProjectsApi(all?: boolean): Promise<IProject[]> {
    let queryFilter : any = { isPrivate: false, needsManualReview: false };

    if (all === false)
        queryFilter = undefined;

    return getAllProjects(queryFilter).catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, Promise.reject));
}

interface IGetProjectsRequestQuery {
    /** @summary Only useable if user is a mod or admin */
    all?: boolean;
}
