import { Request, Response } from "express";
import User from "../../models/User"
import Project from "../../models/Project";
import { findSimilarProjectName, GetDiscordUser, genericServerError } from "../../common/helpers";
import { IDiscordUser } from "../../models/types";

module.exports = (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "${queryCheck}" not provided or malformed`
        }));
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

        deleteProject(discordId, req.query.appName)
            .then(results => {
                res.end("Success");
            })
            .catch(err => genericServerError(err, res));
    })();
};

function checkQuery(query: any): true | string {
    if (!query.accessToken) return "accessToken";
    if (!query.appName) return "appName";

    return true;
}

function deleteProject(discordId: string, appName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        Project.findAll({
            include: [{
                model: User,
                where: { discordId: discordId }
            }]
        }).then(projects => {
            if (projects.length === 0) { reject(`Projects with ID ${discordId} not found`); return; }

            // Filter out the correct app name
            const project = projects.filter(project => JSON.parse(JSON.stringify(project)).appName == appName);

            let similarAppName = findSimilarProjectName(projects, appName);
            if (project.length === 0) { reject(`Project with name "${appName}" could not be found. ${(similarAppName !== undefined ? `Did you mean ${similarAppName}?` : "")}`); return; }
            if (project.length > 1) { reject("More than one project with that name found. Contact a system administrator to fix the data duplication"); return; }

            project[0].destroy({ force: true })
                .then(resolve)
                .catch(reject);
        }).catch(reject);
    });
}
