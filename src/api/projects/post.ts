import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";

interface IProject {
    appName: string;
    description: string;
    isPrivate: boolean;
    launchId: number;
    user: IUser;
};

interface IUser {
    name: string;
    discord: string;
}

interface IProjectUpdateRequest {
    oldProjectData: IProject;
    newProjectData: IProject;
}

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

    updateProject(body)
        .then(results => {
            res.end(JSON.stringify(results))
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });

};

function checkIProject(body: IProject): true | string {
    if (!body.user.name) return "user.name";
    if (!body.user.discord) return "user.discord";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function checkBody(data: IProjectUpdateRequest): true | string {
    if (data.oldProjectData == undefined) return "oldProjectData";
    if (checkIProject(data.oldProjectData) !== true) return "oldProjectData." + checkIProject(data.oldProjectData);

    if (data.newProjectData == undefined) return "newProjectData";
    if (!checkIProject(data.newProjectData) !== true) return "newProjectData." + checkIProject(data.newProjectData);

    return true;
}

function updateProject(projectUpdateData: IProjectUpdateRequest): Promise<[number, Project[]]> {
    return new Promise<[number, Project[]]>((resolve, reject) => {

        Project.update(
            { ...projectUpdateData.newProjectData },
            {
                where: { ...projectUpdateData.oldProjectData, user: { ...projectUpdateData.oldProjectData.user } }
            })
            .then(resolve)
            .catch(reject);
    });
}

