import { Request, Response } from "express";
import Project from "../../models/Project";
import { IProject } from "../../models/types";
import { checkForExistingProject, getUserFromDB, genericServerError, GetDiscordToken } from "../../common/helpers";
import UserProject from "../../models/UserProject";

module.exports = (req: Request, res: Response) => {
    const body = req.body;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        });
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    (async () => {
        let discordId = await GetDiscordToken(req, res);

        submitProject(body, discordId)
            .then(() => {
                res.status(200);
                res.json({ Success: "Success" });
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
                    { userId: user.id, projectId: project.id })
                    .then(() => {
                        resolve(project)
                    })
                    .catch(reject);

            })
            .catch(reject);
    });
}
