import { Request, Response } from "express";
import User from "../../models/User"
import { IUser } from "../../models/types";
import { genericServerError, GetDiscordToken } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    const body = req.body;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        });
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    (async () => {
        body.discordId = await GetDiscordToken(req, res);

        submitUser(body)
            .then(() => {
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

