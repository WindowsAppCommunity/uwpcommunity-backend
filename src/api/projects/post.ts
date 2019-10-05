import { Request, Response } from "express";
import Project, { StdToDbModal_Project, isExistingProject } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader, match } from "../../common/helpers/generic";
import UserProject, { GetProjectsByUserId } from "../../models/UserProject";
import { GetRoleByName } from "../../models/Role";
import { getUserByDiscordId } from "../../models/User";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { BuildResponse, HttpStatus, } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    if (!ProjectFieldsAreValid(body, res)) return;

    submitProject(body, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
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

        const existingUserProjects = await GetProjectsByUserId(user.id);
        if (existingUserProjects.length >= 3) {
            reject("User has exceeded limit of 3 projects");
            return;
        }

        // Create the project
        Project.create(await StdToDbModal_Project({ ...projectRequestData, collaborators: [] }))
            .then((project) => {

                // Create the userproject
                UserProject.create(
                    {
                        userId: user.id,
                        projectId: project.id,
                        isOwner: true, // Only the project owner can create the project
                        roleId: role.id
                    })
                    .then(() => {
                        resolve(project)
                    })
                    .catch(reject);

            })
            .catch(reject);
    });
}


function ProjectFieldsAreValid(project: IPostProjectsRequestBody, res: Response): boolean {
    // Make sure download link is a valid URL
    if (project.downloadLink && !match(project.downloadLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid downloadLink");
        return false;
    }

    // Make sure download link is a valid URL
    if (project.githubLink && !match(project.githubLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid githubLink");
        return false;
    }

    // Make sure download link is a valid URL
    if (project.externalLink && !match(project.externalLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid externalLink");
        return false;
    }

    // Make sure hero image is an image URL or a microsoft store image
    if (project.heroImage && !(match(project.heroImage, /(?:(?:https?:\/\/))[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/=].+(\.jpe?g|\.png|\.gif))/) && match(project.heroImage, /(store-images.s-microsoft.com\/image\/apps)/))) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid externalLink");
        return false;
    }


    return true;
}
interface IPostProjectsRequestBody {
    role: "Developer" | "Other"; // Only a developer or "Other" (manager, etc) can create a new project
    appName: string;
    category: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;
    launchYear?: number;
    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    heroImage: string;
    lookingForRoles: string[];
}
