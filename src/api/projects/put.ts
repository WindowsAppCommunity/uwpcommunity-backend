import { Request, Response } from "express";
import { getUserByDiscordId } from "../../models/User"
import Project, { findSimilarProjectName, getProjectsByDiscordId } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader } from '../../common/helpers/generic';
import { IProject } from "../../models/types";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { GetLaunchIdFromYear } from "../../models/Launch";
import { BuildResponse, HttpStatus, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Query string "${queryCheck}" not provided or malformed`);
        return;
    }

    const bodyCheck = checkIProject(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    updateProject(body, req.query, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

function checkQuery(query: IPutProjectRequestQuery): true | string {
    if (!query.appName) return "appName";

    return true;
}
function checkIProject(body: IProject): true | string {
    if (!body.appName) return "appName";

    return true;
}

function updateProject(projectUpdateRequest: IPutProjectsRequestBody, query: IPutProjectRequestQuery, discordId: string): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {
        const userProjects = (await getProjectsByDiscordId(discordId)).filter(p => query.appName == p.appName);
        if (userProjects.length === 0) { ResponsePromiseReject(`Project "${query.appName}" not found`, HttpStatus.NotFound, reject); return; }

        let similarAppName = findSimilarProjectName(userProjects, query.appName);

        if (!userProjects) {
            ResponsePromiseReject(`Project with name "${query.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`, HttpStatus.NotFound, reject);
            return;
        }

        const DbProjectData: Partial<Project> | void = await StdToDbModal_IPutProjectsRequestBody(projectUpdateRequest, discordId).catch(reject);
        if (DbProjectData) userProjects[0].update(DbProjectData)
            .then(resolve)
            .catch(error => reject({ status: HttpStatus.InternalServerError, reason: `Internal server error: ${error}` }));
    });
}

export function StdToDbModal_IPutProjectsRequestBody(projectData: IPutProjectsRequestBody, discordId: string): Promise<Partial<Project>> {
    return new Promise(async (resolve, reject) => {
        const updatedProject = projectData as IProject;

        const user = await getUserByDiscordId(discordId).catch(reject);
        if (!user) {
            ResponsePromiseReject("User not found", HttpStatus.NotFound, reject);
            return;
        };

        const updatedDbProjectData: Partial<Project> = {
            appName: updatedProject.appName,
            category: updatedProject.category,
            isPrivate: updatedProject.isPrivate,
            downloadLink: updatedProject.downloadLink,
            githubLink: updatedProject.githubLink,
            externalLink: updatedProject.externalLink,
            heroImage: updatedProject.heroImage,
            awaitingLaunchApproval: updatedProject.awaitingLaunchApproval,
            needsManualReview: updatedProject.needsManualReview,
            lookingForRoles: JSON.stringify(updatedProject.lookingForRoles)
        };

        const guildMember = await GetGuildUser(discordId);
        // Only mods or admins can approve an app for Launch
        if (updatedProject.launchYear !== undefined) {
            if (guildMember && guildMember.roles.array().filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0) {
                updatedDbProjectData.launchId = await GetLaunchIdFromYear(updatedProject.launchYear);
            } else {
                ResponsePromiseReject("User has insufficient permissions", HttpStatus.Unauthorized, reject);
            }
        }

        resolve(updatedDbProjectData);
    });
}

/** @interface IProject */
interface IPutProjectsRequestBody {
    appName: string;
    description?: string;
    isPrivate: boolean;

    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;

    heroImage: string;
    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    lookingForRoles?: string[];
    launchYear?: number;
    category?: string;
}

interface IPutProjectRequestQuery {
    /** @summary The app name that's being modified */
    appName: string;
}