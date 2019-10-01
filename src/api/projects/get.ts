import { Request, Response } from "express";
import User from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { IProject } from "../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";

module.exports = async (req: Request, res: Response) => {
    // If someone wants the projects for a specific user, they must be authorized
    if (req.query.discordId) {
        const authAccess = validateAuthenticationHeader(req, res);
        if (!authAccess) return;

        const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);

        // Make sure the requested ID matches the current user
        if (req.query.discordId !== authenticatedDiscordId) {
            res.status(401).send({
                error: "Unauthorized",
                reason: "Discord ID does not belong to user"
            });
            return;
        }

        const results = await getProjectsbyUser(req.query.discordId).catch(err => genericServerError(err, res));
        res.send(results);

    } else {
        const results = await getAllProjects().catch(err => genericServerError(err, res));
        res.send(results);
    }
};

export function getProjectsbyUser(discordId: string): Promise<IProject[]> {
    return new Promise((resolve, reject) => {
        Project
            .findAll({
                include: [{
                    model: User,
                    where: { discordId: discordId }
                }]
            })
            .then(async results => {
                if (results) {
                    let projects: IProject[] = [];

                    for (let project of results) {
                        let proj = await DbToStdModal_Project(project).catch(reject);
                        if (proj) projects.push(proj);
                    }

                    resolve(projects);
                }
            })
            .catch(reject);
    });
}

export function getAllProjects(): Promise<IProject[]> {
    return new Promise((resolve, reject) => {
        Project.findAll()
            .then(async results => {
                if (results) {
                    let projects: IProject[] = [];

                    for (let project of results) {
                        let proj = await DbToStdModal_Project(project).catch(reject);
                        // Only push a project if not private
                        if (proj && !proj.isPrivate) projects.push(proj);
                    }

                    resolve(projects);
                }
            })
            .catch(reject);
    });
}
interface IGetProjectsRequestQuery {
    discordId?: string;
}
