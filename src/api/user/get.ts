import { Request, Response } from "express";
import { getUserByDiscordId, DbToStdModal_User } from "../../models/User";
import { IUser } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";
import { Status, BuildResponse } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        BuildResponse(res, Status.MalformedRequest, `Query string "${queryCheck}" not provided or malformed`); 
        return;
    }

    const user: IUser | void = await GetUser(req.query).catch(err => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, Status.NotFound, "User does not exist in database");
        return;
    }
    
    BuildResponse(res, Status.Success, JSON.stringify(user));
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