import { Request, Response } from "express";
import User from "../../../models/User";
import Project, { DbToStdModal_Project } from "../../../models/Project";
import { IProject } from "../../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    let id = req.params['id'];

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);
    if (authenticatedDiscordId) {

        getProjectById(id)
            .then(result => {
                if (result) {
                    if (result.isPrivate) {
        
                        let showPrivate = false;
        
                        if (result.collaborators) {
                            result.collaborators.forEach(collaborator => {
                                if (collaborator.discordId == authenticatedDiscordId) {
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
            })
            .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));

    }
};

export function getProjectById(projectId: string): Promise<IProject> {
    return new Promise(async (resolve, reject) => {

        let project: IProject;
        Project.findByPk(projectId, { include: [{ model: User }] })
            .then(
                async result => {
                    if (result) {
                        let proj = await DbToStdModal_Project(result).catch(reject);
                        if(proj){
                            project = proj;
                            resolve(project);
                        }
                    }
                }
            ).catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, reject));

    });
}

interface IGetProjectsRequestQuery {
    discordId?: string;
}
