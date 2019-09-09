import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";

interface IProject {
    name: string;
    email: string;
    discord: string;

    appName: string;
    description: string;
    isPrivate: boolean;
};

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
    if (!body.name) return "name";
    if (!body.email) return "email";
    if (!body.discord) return "discord";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function checkBody(data: IProjectUpdateRequest): true | string {
    if (!data.newProjectData) return "newProjectData";
    if (!data.oldProjectData) return "oldProjectData";
    if (!checkIProject(data.newProjectData)) return checkIProject(data.newProjectData);
    if (!checkIProject(data.oldProjectData)) return checkIProject(data.oldProjectData);
    
    return true;
}

function updateProject(projectUpdateData: IProjectUpdateRequest): Promise<[number, Project[]]> {
    return new Promise<[number, Project[]]>((resolve, reject) => {

        Project.update(
            { ...projectUpdateData.newProjectData },
            {
                where: { ...projectUpdateData.oldProjectData }
            })
            .then(resolve)
            .catch(reject);
    });
}

