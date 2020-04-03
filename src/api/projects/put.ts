import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../models/User"
import Project, { findSimilarProjectName } from "../../models/Project";
import { validateAuthenticationHeader } from '../../common/helpers/generic';
import { IProject } from "../../models/types";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { GetLaunchIdFromYear, GetLaunchYearFromId } from "../../models/Launch";
import { BuildResponse, HttpStatus, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";
import { UserOwnsProject } from "../../models/UserProject";

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
    if (!body.description) return "description";
    if (body.isPrivate === undefined) return "isPrivate";
    if (body.awaitingLaunchApproval === undefined) return "awaitingLaunchApproval";
    if (body.needsManualReview === undefined) return "needsManualReview";

    return true;
}

function updateProject(projectUpdateRequest: IPutProjectsRequestBody, query: IPutProjectRequestQuery, discordId: string): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {
        const DBProjects = await Project.findAll({
            where: { appName: query.appName }
        });

        let similarAppName = findSimilarProjectName(DBProjects, query.appName);

        if (!DBProjects) {
            ResponsePromiseReject(`Project with name "${query.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`, HttpStatus.NotFound, reject);
            return;
        }

        const guildMember = await GetGuildUser(discordId);
        const isMod = guildMember && guildMember.roles.array().filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0;


        const user: User | null = await getUserByDiscordId(discordId);
        if (!user) {
            ResponsePromiseReject("User not found", HttpStatus.NotFound, reject);
            return;
        }
        const userOwnsProject: boolean = await UserOwnsProject(user, DBProjects[0]);
        const userCanModify = userOwnsProject || isMod;

        if (!userCanModify) {
            ResponsePromiseReject("Unauthorized user", HttpStatus.Unauthorized, reject);
            return;
        }

        const currentLaunchYear = await GetLaunchYearFromId(DBProjects[0].launchId);
        const shouldUpdateLaunch: boolean = currentLaunchYear !== projectUpdateRequest.launchYear;

        const shouldUpdateManualReview: boolean = DBProjects[0].needsManualReview !== projectUpdateRequest.needsManualReview;

        const shouldUpdateAwaitingLaunch: boolean = DBProjects[0].awaitingLaunchApproval !== projectUpdateRequest.awaitingLaunchApproval;

        const DbProjectData: Partial<Project> | void = await StdToDbModal_IPutProjectsRequestBody(projectUpdateRequest, discordId, shouldUpdateLaunch, shouldUpdateManualReview, shouldUpdateAwaitingLaunch).catch(reject);

        if (DbProjectData) DBProjects[0].update(DbProjectData)
            .then(resolve)
            .catch(error => reject({ status: HttpStatus.InternalServerError, reason: `Internal server error: ${error}` }));
    });
}

export function StdToDbModal_IPutProjectsRequestBody(projectData: IPutProjectsRequestBody, discordId: string, shouldUpdateLaunch: boolean, shouldUpdateManualReview: boolean, shouldUpdateAwaitingLaunch: boolean): Promise<Partial<Project>> {
    return new Promise(async (resolve, reject) => {
        const updatedProject = projectData as IProject;

        const user = await getUserByDiscordId(discordId).catch(reject);
        if (!user) {
            ResponsePromiseReject("User not found", HttpStatus.NotFound, reject);
            return;
        };

        const updatedDbProjectData: Partial<Project> = { appName: projectData.appName };

        // Doing it this way allows us to only update fields that are supplied, without overwriting required fields
        if (updatedProject.description) updatedDbProjectData.description = updatedProject.description;
        if (updatedProject.category) updatedDbProjectData.category = updatedProject.category;
        if (updatedProject.isPrivate !== undefined) updatedDbProjectData.isPrivate = updatedProject.isPrivate;
        if (updatedProject.downloadLink) updatedDbProjectData.downloadLink = updatedProject.downloadLink;
        if (updatedProject.githubLink) updatedDbProjectData.githubLink = updatedProject.githubLink;
        if (updatedProject.externalLink) updatedDbProjectData.externalLink = updatedProject.externalLink;
        if (updatedProject.heroImage) updatedDbProjectData.heroImage = updatedProject.heroImage;
        if (updatedProject.awaitingLaunchApproval !== undefined) updatedDbProjectData.awaitingLaunchApproval = updatedProject.awaitingLaunchApproval;
        if (updatedProject.needsManualReview !== undefined) updatedDbProjectData.needsManualReview = updatedProject.needsManualReview;
        if (updatedProject.lookingForRoles) updatedDbProjectData.lookingForRoles = JSON.stringify(updatedProject.lookingForRoles);

        const guildMember = await GetGuildUser(discordId);
        const isLaunchCoordinator = guildMember && guildMember.roles.array().filter(role => role.name.toLowerCase() === "launch coordinator").length > 0;

        if (shouldUpdateLaunch && updatedProject.launchYear) {
            if (!isLaunchCoordinator) ResponsePromiseReject("User has insufficient permissions", HttpStatus.Unauthorized, reject);
            else {
                updatedDbProjectData.launchId = await GetLaunchIdFromYear(updatedProject.launchYear);
            }
        }

        if (shouldUpdateAwaitingLaunch) {
            if (!isLaunchCoordinator) {
                ResponsePromiseReject("User has insufficient permissions", HttpStatus.Unauthorized, reject);
                return;
            }
        }

        const isMod = guildMember && guildMember.roles.array().filter(role => role.name.toLowerCase() === "mod").length > 0;
        if (shouldUpdateManualReview) {
            if (!isMod) {
                ResponsePromiseReject("User has insufficient permissions", HttpStatus.Unauthorized, reject);
                return;
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