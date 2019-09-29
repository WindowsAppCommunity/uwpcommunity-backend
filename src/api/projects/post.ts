import { Request, Response } from "express";
import Project, { StdToDbModal_Project, isExistingProject } from "../../models/Project";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import UserProject from "../../models/UserProject";
import Role from "../../models/Role";
import { IUser } from "../../models/types";
import { getUserByDiscordId } from "../../models/User";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { BuildResponse, Status } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, Status.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`, "Malformed request"); 
        return;
    }

    submitProject(body, discordId)
        .then(() => {
            BuildResponse(res, Status.Success, "Success");
        })
        .catch((err) => genericServerError(err, res));
};

function checkBody(body: IPostProjectsRequestBody): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (!body.role) return "role";
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

        const role: Role | void | null = (await Role.findOne({ where: { name: projectRequestData.role } }).catch(reject));
        if (!role) {
            reject("Invalid role");
            return;
        }

        // Create the project
        Project.create(await StdToDbModal_Project({ ...projectRequestData }))
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

interface IPostProjectsRequestBody {
    role: "Developer" | "Translator" | "Beta Tester" | "Other";
    appName: string;
    category: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;
    collaborators: IUser[];
    launchYear: number;
}