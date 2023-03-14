import { Request, Response } from "express";
import { HttpStatus, BuildResponse } from "../../../common/helpers/responseHelper";
import ProjectImage, { getImagesForProject } from "../../../models/ProjectImage";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectImagesRequestQuery;
    
    if(!reqQuery.projectId) {
        BuildResponse(res, HttpStatus.MalformedRequest, `id not provided or malformed`);
        return;
    }

    var images = await getImagesForProject(reqQuery.projectId);

    BuildResponse(res, HttpStatus.Success, images);
};

interface IGetProjectImagesRequestQuery {
    projectId: number;
}