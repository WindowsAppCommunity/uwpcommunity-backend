import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { IProject, IDiscordUser } from "../../models/types";
import { checkForExistingProject, getUserFromDB, GetDiscordUser, genericServerError, isLocalhost } from "../../common/helpers";
import UserProject from "../../models/UserProject";

module.exports = (req: Request, res: Response) => {
    const body = req.body;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        }));
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        }));
        return;
    }

    (async () => {
        let discordId;
        if (isLocalhost == false && req.body.accessToken != "admin") {
            const user = await GetDiscordUser(req.body.accessToken).catch((err) => genericServerError(err, res));
            if (!user) {
                res.status(401);
                res.end(`Invalid accessToken`);
                return;
            }

            discordId = (user as IDiscordUser).id;
        } else {
            discordId = req.body.discordId;
        }

        submitProject(body, discordId)
            .then(results => {
                res.status(200);
                res.json(JSON.stringify({
                    Success: "Success",
                }));
            })
            .catch((err) => genericServerError(err, res));
    })();
};

function checkBody(body: IProject): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function submitProject(projectData: IProject, discordId: any): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {

        if (await checkForExistingProject(projectData).catch(reject)) {
            reject("A project with that name already exists");
            return;
        }

        // Get a matching user
        const user = await getUserFromDB(discordId).catch(reject);
        if (!user) {
            reject("User not found");
            return;
        }

        // Create the project
        Project.create(
            { ...projectData })
            .then((project) => {

                // Create the userproject
                UserProject.create(
                    { userId: user.id, projectId: project.id });

                // TODO: check me
                resolve;
            })
            .catch(reject);
    });
}
