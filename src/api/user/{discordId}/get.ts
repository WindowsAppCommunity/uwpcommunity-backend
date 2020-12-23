import { Request, Response } from "express";
import { getUserByDiscordId, DbToStdModal_User } from "../../../models/User";
import { IUser, ResponseErrorReasons } from "../../../models/types";
import { genericServerError } from "../../../common/helpers/generic";
import { HttpStatus, BuildResponse } from "../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    let discordId = req.params['discordId'];

    const user: IUser | void = await GetUser(discordId).catch(err => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, HttpStatus.NotFound, ResponseErrorReasons.UserNotExists);
        return;
    }

    BuildResponse(res, HttpStatus.Success, user);
};

function GetUser(discordId: string): Promise<IUser | undefined> {
    return new Promise(async (resolve, reject) => {
        const DbUser = await getUserByDiscordId(discordId).catch(reject);
        if (!DbUser) {
            resolve();
            return;
        }

        const StdUser = DbToStdModal_User(DbUser)
        if (StdUser == undefined || StdUser == null) {
            reject("Unable to convert database entry");
            return;
        };
        resolve(StdUser);
    });
}