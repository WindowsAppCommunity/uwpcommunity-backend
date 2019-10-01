import { Request, Response } from "express";
import User from "../../models/User"
import Project, { findSimilarProjectName } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { ErrorStatus, BuildErrorResponse, SuccessStatus, BuildSuccessResponse } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const bodyCheck = checkBody(req.body);
    if (bodyCheck !== true) {
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, `Query string "${bodyCheck}" not provided or malformed`);
        return;
    }

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    deleteProject(req.body, discordId)
        .then(() => {
            BuildSuccessResponse(res, SuccessStatus.Success, "Success");
        })
        .catch(err => genericServerError(err, res));
};

function checkBody(body: IDeleteProjectsRequestBody): true | string {
    if (!body.appName) return "appName";
    return true;
}

function deleteProject(projectRequestData: IDeleteProjectsRequestBody, discordId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        Project.findAll({
            include: [{
                model: User,
                where: { discordId: discordId }
            }]
        }).then(projects => {
            if (projects.length === 0) { reject(`Projects with ID ${discordId} not found`); return; }

            // Filter out the correct app name
            const project = projects.filter(project => JSON.parse(JSON.stringify(project)).appName == projectRequestData.appName);

            let similarAppName = findSimilarProjectName(projects, projectRequestData.appName);
            if (project.length === 0) { reject(`Project with name "${projectRequestData.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].destroy({ force: true })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}


interface IDeleteProjectsRequestBody {
    appName: string;
}