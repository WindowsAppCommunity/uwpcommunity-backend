import { Request, Response } from "express";
import User from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { IProject } from "../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const results = await getAllProjects().catch(err => genericServerError(err, res));
    if (results) BuildResponse(res, HttpStatus.Success, results);
};

export function getAllProjects(): Promise<IProject[]> {
    return new Promise((resolve, reject) => {
        Project.findAll()
            .then(async results => {
                if (results) {
                    let projects: IProject[] = [];

                    for (let project of results) {
                        let proj = await DbToStdModal_Project(project).catch(reject);
                        // Only push a project if not private
                        if (proj && !proj.isPrivate && !proj.needsManualReview) projects.push(proj);
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
