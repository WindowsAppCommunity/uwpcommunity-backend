import { Request, Response } from "express";
import Project, { findSimilarProjectName } from "../../models/Project";
import { validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { HttpStatus, BuildResponse, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";
import { GetProjectCollaborators } from "../../models/UserProject";
import ProjectImage from "../../models/ProjectImage";

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

    deleteProject(req.body, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

function checkBody(body: IDeleteProjectsRequestBody): true | string {
    if (!body.appName) return "appName";
    return true;
}

function deleteProject(projectRequestData: IDeleteProjectsRequestBody, discordId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        Project.findAll({
            where: { appName: projectRequestData.appName }
        }).then(async (projects) => {
            if (projects.length === 0) { ResponsePromiseReject(`Project with name "${projectRequestData.appName}" could not be found.}`, HttpStatus.NotFound, reject); return; }
            if (projects.length > 1) { ResponsePromiseReject("More than one project with that name found. Contact a system administrator to fix the data duplication", HttpStatus.InternalServerError, reject); return; }

            const guildMember = await GetGuildUser(discordId);
            const isMod = guildMember && guildMember.roles.cache.filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").array.length > 0;
            const collaborators = await GetProjectCollaborators(projects[0].id);
            const userCanModify = collaborators.filter(user => user.isOwner && user.discordId == discordId).length > 0 || isMod;

            if (!userCanModify) {
                ResponsePromiseReject("Unauthorized user", HttpStatus.Unauthorized, reject);
                return;
            }

            const projectImages = await ProjectImage.findAll({ where: { projectId: projects[0].id } }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject)) as ProjectImage[] | null;

            if (projectImages != null) {
                for (let image of projectImages) {
                    await image.destroy();
                }
            }

            projects[0].destroy({ force: true })
                .then(resolve)
                .catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject));
        }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject));
    });
}


interface IDeleteProjectsRequestBody {
    appName: string;
}