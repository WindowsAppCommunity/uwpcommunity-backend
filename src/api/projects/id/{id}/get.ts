import { Request, Response } from "express";
import User from "../../../../models/User";
import Project, { DbToStdModal_Project, getAllProjects } from "../../../../models/Project";
import { IProject } from "../../../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../../../common/helpers/responseHelper";
import UserProject from "../../../../models/UserProject";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectRequestQuery;

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);
    if (authenticatedDiscordId) {

        getProjectById(reqQuery.id as string, res)
            .then(result => {
                let project: IProject | undefined;

                if (result?.isPrivate ?? false) {
                    let showPrivate = false;

                    result.collaborators?.forEach(collaborator => {
                        if (collaborator.discordId == authenticatedDiscordId) {
                            showPrivate = true;
                        }
                    });

                    if (showPrivate) {
                        project = result;
                    }

                } else {
                    project = result;
                }

                BuildResponse(res, HttpStatus.Success, project);
            })
            .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
    }
};

export function getProjectById(projectId: string, res: Response): Promise<IProject> {
    return new Promise(async (resolve, reject) => {

        var projects: IProject[] = await getAllProjects().catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, reject));

        if (!projects)
            return;

        projects = projects.filter(x => x.id.toString() === projectId);

        resolve(projects[0]);
    });
}

interface IGetProjectRequestQuery {
    id?: string;
}