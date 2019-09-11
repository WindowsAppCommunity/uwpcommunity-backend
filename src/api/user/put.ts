import { Request, Response } from "express";
import User from "../../models/User"
import { IUser, IDiscordUser } from "../../models/types";
import { getUserByDiscordId, GetDiscordUser, genericServerError } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    const body = req.body;
    body.discordId = req.query.accessToken;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        }));
        return;
    }

    let bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
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

        updateUser(body, discordId)
            .then(results => {
                res.end("Success");
            })
            .catch((err) => genericServerError(err, res));
    })();
};

function checkBody(body: IUser): true | string {
    if (!body.name) return "name";
    return true;
}

function updateUser(userData: IUser, discordId: string): Promise<User> {
    return new Promise<User>(async (resolve, reject) => {

        let user = await getUserByDiscordId(discordId);

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

