import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { IProject } from "../../models/types";
import { checkForExistingProject, getUserFromDB } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    const body = req.body;
    body.user = { discordId: req.query.token };

    if (req.query.token == undefined) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "token" not provided or malformed`
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

    submitProject(body)
        .then(results => {
            res.end("Success");
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });
};

function checkBody(body: IProject): true | string {
    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function submitProject(projectData: IProject): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {

        if (await checkForExistingProject(projectData).catch(reject)) {
            reject("A project with that name already exists");
            return;
        }

        // Get a matching user
        const user = await getUserFromDB(projectData.user.discordId).catch(reject);
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
