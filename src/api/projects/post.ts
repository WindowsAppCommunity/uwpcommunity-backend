import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { levenshteinDistance } from '../../common/helpers';

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

            let similarAppName = findSimilarAppName(projects, projectUpdateData.oldProjectData.appName);
            if (project.length === 0) { reject(`Project with name "${projectUpdateData.oldProjectData.appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].update({ ...projectUpdateData.newProjectData })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}

interface ISimilarAppMatch {
    distance: number;
    appName: string;
}
function findSimilarAppName(projects: Project[], appName: string): string | undefined {
    let matches: ISimilarAppMatch[] = [];

    // Calculate and store the distances of each possible match
    for (let project of projects) {
        matches.push({ distance: levenshteinDistance(project.appName, appName), appName: project.appName });
    }

    // Sort by closest match 
    matches = matches.sort((first, second) => second.distance - first.distance);
    
    // If the difference is less than X characters, return a possible match.
    if (matches[0].distance <= 7) return matches[0].appName; // 7 characters is just enough for a " (Beta)" label

    // If the difference is less than 1/3 of the entire string, don't return as a similar app name
    if ((appName.length / 3) < matches[0].distance) return;

    return matches[0].appName;
}