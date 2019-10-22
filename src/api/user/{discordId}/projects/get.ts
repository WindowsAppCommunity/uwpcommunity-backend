import { Request, Response } from "express";
import User from "../../../../models/User";
import Project, { DbToStdModal_Project } from "../../../../models/Project";
import { IProject } from "../../../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../../../common/helpers/discord";
import { HttpStatus, BuildResponse } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    let discordId = req.params['discordId'];

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);

    if (authenticatedDiscordId) {
        // If discordId === authenticatedDiscordId return all projects
        // Else return only public projects
        const results = (discordId === authenticatedDiscordId)
            ? await getAllProjectsbyUser(discordId).catch(err => genericServerError(err, res))
            : await getPublicProjectsbyUser(discordId).catch(err => genericServerError(err, res));

        if (results) BuildResponse(res, HttpStatus.Success, results);
    }
};

export function getAllProjectsbyUser(discordId: string): Promise<IProject[]> {
    return new Promise(async (resolve, reject) => {

        const results = await Project.findAll({
            include: [{
                model: User,
                where: {
                    discordId: discordId
                }
            }]
        }).catch(reject);

        if (results) {
            let projects: IProject[] = [];

            for (let project of results) {
                let proj = await DbToStdModal_Project(project).catch(reject);
                if (proj) projects.push(proj);
            }

            resolve(projects);
        }
    });
}

export function getPublicProjectsbyUser(discordId: string): Promise<IProject[]> {
    return new Promise(async (resolve, reject) => {

        const results = await Project.findAll({
            include: [{
                model: User,
                where: {
                    discordId: discordId
                }
            }],
            where: {
                isPrivate: false
            }
        }).catch(reject);

        if (results) {
            let projects: IProject[] = [];

            for (let project of results) {
                let proj = await DbToStdModal_Project(project).catch(reject);
                if (proj) projects.push(proj);
            }

            resolve(projects);
        }
    });
}

interface IGetProjectsRequestQuery {
    discordId?: string;
}
