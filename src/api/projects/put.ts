import { Request, Response } from "express";
import { StdToDbModal_User, getUserByDiscordId } from "../../models/User"
import Project, { findSimilarProjectName, getProjectsByDiscordId } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader } from '../../common/helpers/generic';
import { IProject } from "../../models/types";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { GetCategoryIdFromName } from "../../models/Category";
import { GetLaunchIdFromYear } from "../../models/Launch";
import { UserOwnsProject } from "../../models/UserProject";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "${queryCheck}" not provided or malformed`
        });
        return;
    }

    const bodyCheck = checkIProject(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    updateProject(body, req.query, discordId)
        .then(() => {
            res.end("Success");
        })
        .catch((err) => genericServerError(err, res));
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
        if (userProjects.length === 0) { reject(`Project "${query.appName}" not found`); return; }

        let similarAppName = findSimilarProjectName(userProjects, query.appName);

        if (!userProjects) { reject(`Project with name "${query.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }

        const DbProjectData: Partial<Project> = await StdToDbModal_IPutProjectsRequestBody(projectUpdateRequest, discordId);
        userProjects[0].update(DbProjectData)
            .then(resolve)
            .catch(reject);
    });
}

export function StdToDbModal_IPutProjectsRequestBody(projectData: IPutProjectsRequestBody, discordId: string): Promise<Partial<Project>> {
    return new Promise(async (resolve, reject) => {
        const updatedProject = projectData as IProject;

        const updatedDbProjectData: Partial<Project> = {
            appName: updatedProject.appName
        };

        const user = await getUserByDiscordId(discordId).catch(reject);
        if (!user) {
            reject("User not found");
            return;
        };

        if (updatedProject.description) updatedDbProjectData.description = updatedProject.description;
        if (updatedProject.category) updatedDbProjectData.categoryId = await GetCategoryIdFromName(updatedProject.category)
        if (updatedProject.launchYear !== undefined) updatedDbProjectData.launchId = await GetLaunchIdFromYear(updatedProject.launchYear);
        if (updatedProject.isPrivate) updatedDbProjectData.isPrivate = updatedProject.isPrivate;
        if (updatedProject.downloadLink) updatedDbProjectData.downloadLink = updatedProject.downloadLink;
        if (updatedProject.githubLink) updatedDbProjectData.githubLink = updatedProject.githubLink;
        if (updatedProject.externalLink) updatedDbProjectData.externalLink = updatedProject.externalLink;
        if (updatedProject.heroImage) updatedDbProjectData.heroImage = updatedProject.heroImage;
        if (updatedProject.awaitingLaunchApproval) updatedDbProjectData.awaitingLaunchApproval = updatedProject.awaitingLaunchApproval;
        if (updatedProject.needsManualReview) updatedDbProjectData.needsManualReview = updatedProject.needsManualReview;
        if (updatedProject.lookingForRoles) updatedDbProjectData.lookingForRoles = JSON.stringify(updatedProject.lookingForRoles);

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