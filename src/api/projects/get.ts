import { Request, Response } from "express";
import User from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { IProject } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";
import { ErrorStatus, BuildErrorResponse, SuccessStatus, BuildSuccessResponse } from "../../common/helpers/responseHelper";

module.exports = (req: Request, res: Response) => {
    getProjects(req.query)
        .then(result => {
            BuildSuccessResponse(res, SuccessStatus.Success, JSON.stringify(result));
        })
        .catch(err => genericServerError(err, res));
};

export function getProjects(projectRequestData?: IGetProjectsRequestQuery): Promise<IProject[]> {
    return new Promise((resolve, reject) => {
        Project
            .findAll((projectRequestData && projectRequestData.discordId ? {
                include: [{
                    model: User,
                    where: { discordId: projectRequestData.discordId }
                }]
            } : undefined))
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

interface IGetProjectsRequestQuery {
    discordId?: string;
}
