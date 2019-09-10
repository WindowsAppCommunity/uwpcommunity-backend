import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { findSimilarProjectName } from '../../common/helpers';
import { IProject } from "../../models/types";

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
            res.end("Success");
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });

};

function checkIProject(body: IProject): true | string {
    if (!body.user.name) return "user.name";
    if (!body.user.discordId) return "user.discordId";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function checkBody(data: IProjectUpdateRequest): true | string {
    if (data.oldProjectData == undefined) return "oldProjectData";
    if (checkIProject(data.oldProjectData) !== true) return "oldProjectData." + checkIProject(data.oldProjectData);

    if (data.newProjectData == undefined) return "newProjectData";
    if (checkIProject(data.newProjectData) !== true) return "newProjectData." + checkIProject(data.newProjectData);

    return true;
}

function updateProject(projectUpdateData: IProjectUpdateRequest): Promise<Project> {
    return new Promise<Project>((resolve, reject) => {

        Project.findAll({
            include: [{
                model: User,
                where: { discordId: projectUpdateData.oldProjectData.user.discordId }
            }]
        }).then(projects => {
            if (projects.length === 0) { reject(`Projects with ID ${projectUpdateData.oldProjectData.user.discordId} not found`); return; }

            // Filter out the correct app name
            const project = projects.filter(project => JSON.parse(JSON.stringify(project)).appName == projectUpdateData.oldProjectData.appName);

            let similarAppName = findSimilarProjectName(projects, projectUpdateData.oldProjectData.appName);
            if (project.length === 0) { reject(`Project with name "${projectUpdateData.oldProjectData.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].update({ ...projectUpdateData.newProjectData })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}
