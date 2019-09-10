import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { IProject } from "../../models/types";

module.exports = (req: Request, res: Response) => {
    const body = req.body;
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
            res.end(JSON.stringify(results))
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });
};

function checkBody(body: IProject): true | string {
    if (!body.user) return "user";
    if (!body.user.name) return "user.name";
    if (!body.user.discordId) return "user.discordId";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function submitProject(projectData: IProject): Promise<Project> {
    return new Promise<Project>(async (resolve, reject) => {

        if(await checkForExistingProject(projectData).catch(reject)) {
            reject("A project with that name already exists");
            return;
        }

        Project.create(
            { ...projectData },
            {
                include: [User]
            })
            .then(resolve)
            .catch(reject);
    });
}

function checkForExistingProject(project: IProject): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        Project.findAll({
            where: { appName: project.appName }
        }).then(projects => {
            resolve(projects.length > 0);
        }).catch(reject)
    });
} 