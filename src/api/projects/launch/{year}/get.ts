import { Request, Response } from "express";
import { DbToStdModal_Project } from "../../../../models/Project";
import { IProject, IProjects } from "../../../../models/types";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectRequestQuery;

    getProjectByYear(reqQuery.year as string)
        .then(results => {
            let projects: IProjects | undefined;
            if (results) {
                projects = results;
            }
            BuildResponse(res, HttpStatus.Success, projects);
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

export function getProjectByYear(year: string): Promise<IProjects> {
    return new Promise(async (resolve, reject) => {

      /*   await getProjectByLaunchYear(year)
            .then(
                async results => {

                    let project: IProject[] = [];
                    let iProjects: IProjects = {
                        privateCount: 0,
                        projects: project
                    };

                    if (results.length > 0) {
                        let i = 0;
                        for (let project of results) {
                            let proj = await DbToStdModal_Project(project);

                            // Only push a project if not private
                            if (proj && !proj.isPrivate && !proj.needsManualReview)
                                iProjects.projects.push(proj);

                            if (proj && proj.isPrivate)
                                i++;
                        }
                        iProjects.privateCount = i;
                    } else {
                        ResponsePromiseReject("Year not found", HttpStatus.NotFound, reject);
                        return;
                    }

                    resolve(iProjects);
                }
            ).catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, reject)); */

    });
}

interface IGetProjectRequestQuery {
    year?: string;
}