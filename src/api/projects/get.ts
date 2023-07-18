import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../common/generic.js";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/discord.js";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/responseHelper.js";
import projects from "../sdk/projects.js";
import { IProject } from "../sdk/interface/IProject.js";

export default async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectsRequestQuery;

    var isMod = await checkIsMod(req, res);
    const projects = await getAllProjectsApi(reqQuery.all && isMod);

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
        return [...user.roles.cache.values()].filter(role => role.name == "Mod" || role.name == "Admin").length > 0;
    }
    return false;
}

export async function getAllProjectsApi(all?: boolean): Promise<IProject[]> {
    let allProjects = projects.map(x => x.project);

    if (all !== true)
        allProjects = (allProjects as IProject[]).filter(x => x.needsManualReview == false && x.isPrivate == false);

    return allProjects;
}

interface IGetProjectsRequestQuery {
    /** @summary Only useable if user is a mod or admin */
    all?: boolean;
}
