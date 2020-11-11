import { Request, Response } from "express";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { IProject } from "../../models/types";
import { validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectsRequestQuery;

    const projects = await getAllProjects(reqQuery.all && await isMod(req, res)).catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
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

export async function getAllProjects(all?: boolean): Promise<IProject[]> {
    const DbProjects = await Project.findAll().catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, Promise.reject));
    let projects: IProject[] = [];

    if (DbProjects) {
        for (let project of DbProjects) {
            let proj = await DbToStdModal_Project(project).catch(Promise.reject);
            // Only push a project if not private
            if (proj && (!proj.isPrivate && !proj.needsManualReview || all))
                projects.push(proj);
        }
    }

    return projects;
}

interface IGetProjectsRequestQuery {
    /** @summary Only useable if user is a mod or admin */
    all?: boolean;
}
