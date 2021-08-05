import { Request, Response } from "express";
import Project, { StdToDbModal_Project, isExistingProject, RefreshProjectCache, ProjectFieldsAreValid } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader, match } from "../../common/helpers/generic";
import UserProject, { GetProjectsByUserId } from "../../models/UserProject";
import { GetRoleByName } from "../../models/Role";
import { getUserByDiscordId } from "../../models/User";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { BuildResponse, HttpStatus, } from "../../common/helpers/responseHelper";
import ProjectImage from "../../models/ProjectImage";
import { IProject } from "../../models/types";
import ProjectFeature from "../../models/ProjectFeature";

module.exports = async (req: Request, res: Response) => {
    const body = req.body as IPostProjectsRequestBody;

    body.images == body.images ?? [];

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess)
        return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId)
        return;

    const bodyCheck = checkBody(body);

    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    if (!await ProjectFieldsAreValid(body as unknown as IProject, res))
        return;

    submitProject(body, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
            RefreshProjectCache();
        })
        .catch((err) => genericServerError(err, res));
};

function checkBody(body: IPostProjectsRequestBody): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (!body.role) return "role";
    if (!body.category) return "category";
    if (!body.heroImage) return "heroImage";
    if (body.isPrivate == undefined) return "isPrivate";
    return true;
}

function submitProject(projectRequestData: IPostProjectsRequestBody, discordId: any): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {

        if (await isExistingProject(projectRequestData.appName).catch(reject)) {
            reject("A project with that name already exists");
            return;
        }

        // Get a matching user
        const user = await getUserByDiscordId(discordId).catch(reject);
        if (!user) {
            reject("User not found");
            return;
        }

        const role = await GetRoleByName(projectRequestData.role);
        if (!role) {
            reject("Invalid role");
            return;
        }

        const existingUserProjects = await GetProjectsByUserId(user.id, true);

        if (existingUserProjects.length > 5) {
            reject("User has reached or exceeded 5 project limit");
            return;
        }

        // If review status is unspecified, default to true
        if (projectRequestData.needsManualReview == undefined) projectRequestData.needsManualReview = true;

        var projectData = await StdToDbModal_Project({ ...projectRequestData });

        // Create the project
        await Project.create(projectData).catch(reject);

        var project = await Project.findAll({ where: { appName: projectData.appName ?? "" } }) as Project[];

        if (!project || project.length === 0)
            return;

        // Create the userproject
        await UserProject.create(
            {
                userId: user.id,
                projectId: project[0].id,
                isOwner: true, // Only the project owner can create the project
                roleId: role.id
            })
            .then(() => createImages(projectRequestData, project[0]))
            .then(() => createFeatures(projectRequestData, project[0]))
            .catch(reject);

        resolve(project[0]);
    });
}

function createImages(projectRequestData: IPostProjectsRequestBody, project: Project): Promise<void> {
    return new Promise(async (resolve, reject) => {

        for (let url of projectRequestData.images ?? []) {
            if (url.length == 0 || url.length > 300)
                continue;

            await ProjectImage.create(
                {
                    projectId: project.id,
                    imageUrl: url
                }).catch(reject);
        }

        resolve();
    });
}

function createFeatures(projectRequestData: IPostProjectsRequestBody, project: Project): Promise<void> {
    return new Promise(async (resolve, reject) => {

        for (let feature of projectRequestData.features ?? []) {
            if (feature.length == 0 || feature.length > 240)
                continue;

            await ProjectFeature.create(
                {
                    projectId: project.id,
                    feature: feature
                }).catch(reject);
        }

        resolve();
    });
}

interface IPostProjectsRequestBody {
    role: "Developer"; // Only a developer can create a new project
    appName: string;
    category: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;
    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    images?: string[];
    features?: string[];
    heroImage: string;
    appIcon?: string;
    accentColor?: string;
    lookingForRoles: string[];
}
