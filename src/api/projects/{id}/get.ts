import { Request, Response } from "express";
import User from "../../../models/User";
import Project, { DbToStdModal_Project } from "../../../models/Project";
import { IProject } from "../../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../../common/helpers/discord";
import { HttpStatus, BuildResponse } from "../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    let id = req.params['id'];

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);

    if (authenticatedDiscordId) {
        const result = await getPrjectById(id).catch(err => genericServerError(err, res));

        if (result) {
            if (result.isPrivate) {

                let showPrivate = false;

                if (result.users) {
                    result.users.forEach(element => {
                        if (element.discordId == authenticatedDiscordId) {
                            showPrivate = true;
                        }
                    });
                }

                if (showPrivate) {
                    BuildResponse(res, HttpStatus.Success, result);
                } else {
                    BuildResponse(res, HttpStatus.Success, "");
                }

            } else {
                BuildResponse(res, HttpStatus.Success, result);
            }
        }
    }

};

export function getPrjectById(projectId: string): Promise<Project> {
    return new Promise(async (resolve, reject) => {

        let project: Project = new Project();
        const result = await Project.findByPk(projectId, { include: [{ model: User }] })
        if (result) {
            project = result;
        }

        resolve(project);

    });
}

interface IGetProjectsRequestQuery {
    discordId?: string;
}
