import { Request, Response } from "express";
import User from "../../../../models/User";
import Project, { DbToStdModal_Project } from "../../../../models/Project";
import { IProject } from "../../../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../../../common/helpers/responseHelper";
import Launch from "../../../../models/Launch";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectRequestQuery;

    getProjectByYear(reqQuery.year as string, res)
        .then(result => {
            // let projects: IProject[] | undefined;
            if (result) {
                BuildResponse(res, HttpStatus.Success, result);
            } else {
                BuildResponse(res, HttpStatus.Success, "");
            }
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));

};

export function getProjectByYear(year: string, res: Response): Promise<Project[]> {
    return new Promise(async (resolve, reject) => {

        // let projects: IProject;
        // {
        //     projects: IProject[],
        //     privateCount: number
        // }


        Project.findAll({
            include: [{
                model: Launch,
                where: {
                    year: year
                }
            },{
                model: User
            }]
        }).then(
            async result => {
                // projects = result;
                resolve(result);
            }
        ).catch(err => ResponsePromiseReject("Internal server error: " + err, HttpStatus.InternalServerError, reject));

    });
}

interface IGetProjectRequestQuery {
    year?: string;
}