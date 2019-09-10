import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { findSimilarProjectName } from "../../common/helpers";

interface IProject {
    appName: string;
    description: string;
    isPrivate: boolean;
    launchId: number;
    user: IUser;
};

interface IUser {
    name: string;
    discordId: string;
    email?: string;
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

    deleteProject(body)
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
    if (!body.user.name) return "user.name";
    if (!body.user.discordId) return "user.discordId";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function deleteProject(projectData: IProject): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        Project.findAll({
            include: [{
                model: User,
                where: { discordId: projectData.user.discordId }
            }]
        }).then(projects => {
            if (projects.length === 0) { reject(`Projects with ID ${projectData.user.discordId} not found`); return; }

            // Filter out the correct app name
            const project = projects.filter(project => JSON.parse(JSON.stringify(project)).appName == projectData.appName);

            let similarAppName = findSimilarProjectName(projects, projectData.appName);
            if (project.length === 0) { reject(`Project with name "${projectData.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].destroy({ force: true })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}
