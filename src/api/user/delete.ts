import { Request, Response } from "express";
import User from "../../models/User"
import { IProject, IUser } from "../../models/types";
import Project from "../../models/Project";
import { getUserByDiscordId, getProjectsByUserDiscordId } from "../../common/helpers";

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

    deleteUser(body)
        .then(results => {
            res.end("Success");
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });

};

function checkBody(body: IUser): true | string {
    if (!body.name) return "name";
    if (!body.discordId) return "discordId";
    return true;
}

function deleteUser(userData: IUser): Promise<void> {
    return new Promise(async (resolve, reject) => {

        // Find the projects
        const projects = await getProjectsByUserDiscordId(userData.discordId);

        if (!projects) return;

        // Delete all associated projects with this user
        for (let project of projects) {
            await project.destroy().catch(reject);
        }

        // Find the user
        const user = await getUserByDiscordId(userData.discordId);
        if (!user) { reject("User not found"); return; }

        // Delete the user
        user.destroy();
    });
}
