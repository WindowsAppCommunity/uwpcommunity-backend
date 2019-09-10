import { Request, Response } from "express";
import User from "../../models/User"
import { IUser } from "../../models/types";
import { getUserByDiscordId } from "../../common/helpers";

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

    updateUser(body)
        .then(results => {
            res.end(JSON.stringify(results))
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

function updateUser(userData: IUser): Promise<User> {
    return new Promise<User>(async (resolve, reject) => {

        let user = await getUserByDiscordId(userData.discordId);

        if (!user) {
            reject("User not found");
            return;
        }

        // Update only the display name and public contact email
        user.update({ name: userData.name, email: userData.email })
            .then(resolve)
            .catch(reject);
    });
}

