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
    if (!body.user.name) return "user.name";
    if (!body.user.discordId) return "user.discordId";

    if (!body.appName) return "appName";
    if (!body.description) return "description";
    if (body.isPrivate == undefined) return "isPrivate";

    return true;
}

function submitProject(participantData: IProject): Promise<Project> {
    return new Promise<Project>((resolve, reject) => {
        Project.create(
            { ...participantData },
            {
                include: [User]
            })
            .then(resolve)
            .catch(reject);
    });
}

