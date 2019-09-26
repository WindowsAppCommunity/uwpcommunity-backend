import { Request, Response } from "express";
import { getUserByDiscordId, DbToStdModal_User } from "../../models/User";
import { IUser } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";

module.exports = async (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "${queryCheck}" not provided or malformed`
        });
        return;
    }

    const user: IUser | void = await GetUser(req.query).catch(err => genericServerError(err, res));
    if (!user) {
        res.status(404);
        res.json({
            error: "Not found",
            reason: `User does not exist`
        });
        return;
    }
    res.json(user);
};

function GetUser(query: IGetUserRequestQuery): Promise<IUser> {
    return new Promise(async (resolve, reject) => {
        const DbUser = await getUserByDiscordId(query.discordId).catch(reject);
        if (!DbUser) return;

        const StdUser = await DbToStdModal_User(DbUser).catch(reject);
        if (StdUser == undefined || StdUser == null) return;
        resolve(StdUser);
    });
}

function checkQuery(query: IGetUserRequestQuery): true | string {
    if (!query.discordId) return "discordId";

    return true;
}
interface IGetUserRequestQuery {
    /** @summary The discord ID of the user to get */
    discordId: string;
}