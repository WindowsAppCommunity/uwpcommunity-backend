import { Request, Response } from "express";
import { HttpStatus, BuildResponse } from "../../../common/helpers/responseHelper";
import { getFeaturesForProject } from "../../../models/ProjectFeature";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectFeaturesRequestQuery;
    
    if(!reqQuery.projectId) {
        BuildResponse(res, HttpStatus.MalformedRequest, `id not provided or malformed`);
        return;
    }

    var images = await getFeaturesForProject(reqQuery.projectId);

    BuildResponse(res, HttpStatus.Success, images);
};

interface IGetProjectFeaturesRequestQuery {
    projectId: number;
}