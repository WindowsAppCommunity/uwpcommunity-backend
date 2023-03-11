import { Request, Response } from "express";
import Project, { DbToStdModal_Project, getAllDbProjects, getAllProjects } from "../../../../models/Project";
import { IProject, IProjects } from "../../../../models/types";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectRequestQuery;

    getProjectByLaunchYear(reqQuery.year as string)
        .then(results => {
            BuildResponse(res, HttpStatus.Success, results);
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

export function getProjectByLaunchYear(year: string): Promise<IProjects> {
    return new Promise(async (resolve, reject) => {
        // get all projects
        const allDbProjects = await getAllDbProjects();

        // find only the ones for the given launch year.
        var projectsFromLaunchYear = allDbProjects.filter(x => x.tags?.filter(tag => tag.name == `Launch ${year}`).length ?? 0 > 0);

        // filter out private projects
        var publicLaunchProjects = projectsFromLaunchYear.filter(x => !x.isPrivate);

        resolve({
            projects: publicLaunchProjects.map(DbToStdModal_Project),
            privateCount: projectsFromLaunchYear.length - publicLaunchProjects.length,
        });
    });
}

interface IGetProjectRequestQuery {
    year?: string;
}