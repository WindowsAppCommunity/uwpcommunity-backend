import { Request, Response } from "express";
import Project, { getAllDbProjects, getAllProjects, nukeProject, RefreshProjectCache } from "../../models/Project";
import { validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";
import UserProject, { GetProjectCollaborators } from "../../models/UserProject";
import ProjectImage from "../../models/ProjectImage";
import ProjectTag from "../../models/ProjectTag";

module.exports = async (req: Request, res: Response) => {
    const bodyCheck = checkBody(req.body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Query string "${bodyCheck}" not provided or malformed`);
        return;
    }

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    nukeProject((req.body as IDeleteProjectsRequestBody).appName, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
            RefreshProjectCache();
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

function checkBody(body: IDeleteProjectsRequestBody): true | string {
    if (!body.appName) return "appName";
    return true;
}


interface IDeleteProjectsRequestBody {
    appName: string;
}