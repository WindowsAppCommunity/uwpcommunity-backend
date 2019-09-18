import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { IProject, IDiscordUser } from "../../models/types";
import { checkForExistingProject, getUserFromDB, GetDiscordUser, genericServerError } from "../../common/helpers";

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
        const user = await GetDiscordUser(req.body.accessToken).catch((err) => genericServerError(err, res));
        if (!user) {
            res.status(401);
            res.end(`Invalid accessToken`);
            return;
        }
        
        let discordId = (user as IDiscordUser).id;

        submitProject(body, discordId)
            .then(results => {
                res.end("Success");
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

function submitProject(projectData: IProject, discordId: string): Promise<Project> {
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

        // Set the userId to the found user
        projectData.userId = user.id;

        // Create the project
        Project.create(
            { ...projectData })
            .then(resolve)
            .catch(reject);
    });
}
