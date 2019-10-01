import { Request, Response } from "express";
import { getUserByDiscordId, DbToStdModal_User } from "../../models/User";
import { IUser, ResponseErrorReasons } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";
import { ErrorStatus, BuildErrorResponse, SuccessStatus, BuildSuccessResponse } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, `Query string "${queryCheck}" not provided or malformed`); 
        return;
    }

    const user: IUser | void = await GetUser(req.query).catch(err => genericServerError(err, res));
    if (!user) {
        BuildErrorResponse(res, ErrorStatus.NotFound, ResponseErrorReasons.UserNotExists);
        return;
    }
    
    BuildSuccessResponse(res, SuccessStatus.Success, JSON.stringify(user));
};

function GetUser(query: IGetUserRequestQuery): Promise<IUser | undefined> {
    return new Promise(async (resolve, reject) => {
        const DbUser = await getUserByDiscordId(query.discordId).catch(reject);
        if (!DbUser) {
            resolve();
            return;
        }

        const StdUser = await DbToStdModal_User(DbUser).catch(reject);
        if (StdUser == undefined || StdUser == null) {
            reject("Unable to convert database entry");
            return;
        };
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