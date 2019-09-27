import { Request, Response } from "express";
import { getUserByDiscordId, DbToStdModal_User } from "../../models/User";
import { IUser } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";
import { MalformedRequest, NotFound } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        MalformedRequest(res, `Query string "${queryCheck}" not provided or malformed`);  
        return;
    }

    const user: IUser | void = await GetUser(req.query).catch(err => genericServerError(err, res));
    if (!user) {
        NotFound(res, `User does not exist in database`);
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