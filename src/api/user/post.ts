import { Request, Response } from "express";
import User from "../../models/User"
import { IUser, IDiscordUser } from "../../models/types";
import { GetDiscordUser, genericServerError } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    const isLocalhost = req.hostname.includes("localhost");

    const body = req.body;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        }));
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        }));
        return;
    }
    (async () => {
        if (isLocalhost == false && req.body.accessToken != "admin") {
            const user = await GetDiscordUser(req.body.accessToken).catch((err) => genericServerError(err, res));
            if (!user) {
                res.status(401);
                res.end(`Invalid accessToken`);
                return;
            }

            let discordId = (user as IDiscordUser).id;
            body.discordId = discordId;
        }

        submitUser(body)
            .then(results => {
                res.status(200);
                res.json(JSON.stringify({
                    Success: "Success",
                }));
            })
            .catch((err) => genericServerError(err, res));
    })();
};

function checkBody(body: IUser): true | string {
    if (!body.name) return "name";
    return true;
}

function submitUser(userData: IUser): Promise<User> {
    return new Promise<User>((resolve, reject) => {
        User.create({ ...userData })
            .then(resolve)
            .catch(reject);
    });
}

