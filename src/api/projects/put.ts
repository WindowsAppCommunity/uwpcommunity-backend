import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../models/User"
import Project, { getAllDbProjects, ProjectFieldsAreValid, RefreshProjectCache } from "../../models/Project";
import { validateAuthenticationHeader } from '../../common/helpers/generic';
import { IProject } from "../../models/types";
import { GetDiscordIdFromToken, GetGuildUser } from "../../common/helpers/discord";
import { BuildResponse, HttpStatus, ResponsePromiseReject, IRequestPromiseReject } from "../../common/helpers/responseHelper";
import { UserOwnsProject } from "../../models/UserProject";
import ProjectImage from "../../models/ProjectImage";
import ProjectFeature from "../../models/ProjectFeature";
import ProjectTag from "../../models/ProjectTag";

module.exports = async (req: Request, res: Response) => {
    const body = req.body as IProject;

    body.images == body.images ?? [];

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

    if (!await ProjectFieldsAreValid(body, res))
        return;

    updateProject(body, req.query, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
            RefreshProjectCache();
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

function updateProject(projectUpdateRequest: IProject, query: IPutProjectRequestQuery, discordId: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        let DBProjects = await getAllDbProjects();

        var appName = decodeURIComponent(query.appName);

        DBProjects = DBProjects.filter(x => x.appName === appName);

        if (DBProjects.length === 0) {
            ResponsePromiseReject(`Project with name "${appName}" could not be found.`, HttpStatus.NotFound, reject);
            return;
        }

        const guildMember = await GetGuildUser(discordId);
        const isMod = guildMember && [...guildMember.roles.cache.values()].filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0;

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

        const shouldUpdateManualReview: boolean = DBProjects[0].needsManualReview !== projectUpdateRequest.needsManualReview;

        const shouldUpdateAwaitingLaunch: boolean = DBProjects[0].awaitingLaunchApproval !== projectUpdateRequest.awaitingLaunchApproval;

        const DbProjectData: Partial<Project> | void = await StdToDbModal_IPutProjectsRequestBody(projectUpdateRequest, discordId, shouldUpdateManualReview, shouldUpdateAwaitingLaunch).catch(reject);

        if (DbProjectData) {
            await DBProjects[0].update(DbProjectData)
                .then(() => updateImages(DBProjects, projectUpdateRequest))
                .then(() => updateFeatures(DBProjects, projectUpdateRequest))
                .then(() => updateTags(DBProjects, projectUpdateRequest))
                .catch(error => reject({ status: HttpStatus.InternalServerError, reason: `Internal server error: ${error}` }))
        }

        resolve();
    });
}

function updateImages(DBProjects: Project[], projectUpdateRequest: IProject) {
    return new Promise<void>(async (resolve, reject) => {

        // The images in the DB should match those sent in this request
        const existingDbImages = await ProjectImage.findAll({ where: { projectId: DBProjects[0].id } });

        projectUpdateRequest.images = projectUpdateRequest.images ?? [];

        if (existingDbImages) {
            // Remove images from DB that exist in DB but don't exist in req
            for (let image of existingDbImages) {
                if (projectUpdateRequest.images.includes(image.imageUrl) == false) {
                    await image.destroy();
                }
            }

            var existingDbImageUrls = existingDbImages.map(x => x.imageUrl);

            // Create images in the DB that exist in req but not DB
            for (let url of projectUpdateRequest.images) {
                if (url.length == 0 || url.length > 300)
                    continue;

                if (existingDbImageUrls.includes(url) === false) {
                    await ProjectImage.create(
                        {
                            projectId: DBProjects[0].id,
                            imageUrl: url
                        }).catch(err => {
                            console.log(err);
                            reject(err);
                        });
                }
            }

            resolve();
        }
    });
}

function updateFeatures(DBProjects: Project[], projectUpdateRequest: IProject) {
    return new Promise<void>(async (resolve, reject) => {

        // The features in the DB should match those sent in this request
        const existingDbFeatureRows = await ProjectFeature.findAll({ where: { projectId: DBProjects[0].id } });

        projectUpdateRequest.features = projectUpdateRequest.features ?? [];

        if (existingDbFeatureRows) {
            // Remove features from DB that exist in DB but don't exist in req
            for (let feature of existingDbFeatureRows) {
                if (projectUpdateRequest.features.includes(feature.feature) == false) {
                    await feature.destroy();
                }
            }

            var existingDbFeatures = existingDbFeatureRows.map(x => x.feature);

            // Create features in the DB that exist in req but not DB
            for (let feature of projectUpdateRequest.features) {
                if (feature.length == 0 || feature.length > 240)
                    continue;

                if (existingDbFeatures.includes(feature) === false) {
                    await ProjectFeature.create(
                        {
                            projectId: DBProjects[0].id,
                            feature: feature,
                        }).catch(err => {
                            console.log(err);
                            reject(err);
                        });
                }
            }
        }

        resolve();
    });
}

function updateTags(DBProjects: Project[], projectUpdateRequest: IProject) {
    return new Promise<void>(async (resolve, reject) => {

        // The tags in the DB should match those sent in this request
        const existingDbProjectTags = await ProjectTag.findAll({ where: { projectId: DBProjects[0].id } });

        projectUpdateRequest.tags = projectUpdateRequest.tags ?? [];

        if (existingDbProjectTags) {
            // Remove tags from DB that exist in DB but don't exist in req
            for (let tag of existingDbProjectTags) {
                if ((projectUpdateRequest.tags.filter(x => x.id == tag.id).length > 0) == false) {
                    await tag.destroy();
                }
            }

            // Create tags in the DB that exist in req but not DB
            for (let tag of projectUpdateRequest.tags) {
                if (!tag.id)
                    continue;

                if ((existingDbProjectTags.filter(x => x.id == tag.id).length > 0) === false) {
                    await ProjectTag.create(
                        {
                            projectId: DBProjects[0].id,
                            tagId: tag.id,
                        })
                        .catch(err => {
                            console.log(err);
                            reject(err);
                        });
                }
            }
        }

        resolve();
    });
}

export function StdToDbModal_IPutProjectsRequestBody(projectData: IProject, discordId: string, shouldUpdateManualReview: boolean, shouldUpdateAwaitingLaunch: boolean): Promise<Partial<Project>> {
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
        if (updatedProject.appIcon) updatedDbProjectData.appIcon = updatedProject.appIcon;
        if (updatedProject.awaitingLaunchApproval !== undefined) updatedDbProjectData.awaitingLaunchApproval = updatedProject.awaitingLaunchApproval;
        if (updatedProject.needsManualReview !== undefined) updatedDbProjectData.needsManualReview = updatedProject.needsManualReview;
        if (updatedProject.lookingForRoles) updatedDbProjectData.lookingForRoles = JSON.stringify(updatedProject.lookingForRoles);

        const guildMember = await GetGuildUser(discordId);

        const isMod = guildMember && [...guildMember.roles.cache.values()].filter(role => role.name.toLowerCase() === "mod").length > 0;
        if (shouldUpdateManualReview) {
            if (!isMod) {
                ResponsePromiseReject("User has insufficient permissions", HttpStatus.Unauthorized, reject);
                return;
            }
        }

        resolve(updatedDbProjectData);
    });
}

interface IPutProjectRequestQuery {
    /** @summary The app name that's being modified */
    appName: string;
}