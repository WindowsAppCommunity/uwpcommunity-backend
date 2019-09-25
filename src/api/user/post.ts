import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../models/User"
import { IUser, ResponseErrorReasons } from "../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    const user = await getUserByDiscordId(discordId).catch((err) => genericServerError(err, res));

    if (user) {
        res.status(400);
        res.json({
            error: "Bad request",
            reason: ResponseErrorReasons.UserExists
        });
        return;
    }

    submitUser({ ...body, discordId: discordId })
        .then(() => {
            res.status(200);
            res.send("Success");
        })
        .catch((err) => genericServerError(err, res));
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

