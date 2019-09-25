import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../models/User"
import { IUser } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    if (!req.headers.authorization) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: "Missing authorization header"
        });
        return;
    }

    let accessToken = req.headers.authorization.replace("Bearer ", "");
    let discordId = await GetDiscordIdFromToken(accessToken, res);
    if (!discordId) return;

    let bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        });
        return;
    }

    updateUser(body, discordId)
        .then(() => {
            res.end("Success");
        })
        .catch((err) => genericServerError(err, res));
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

