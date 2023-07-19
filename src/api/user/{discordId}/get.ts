import { Request, Response } from "express";
import { ResponseErrorReasons } from "../../../models/types.js";
import { HttpStatus, BuildResponse } from "../../../common/responseHelper.js";
import { IDiscordConnection, IUserConnection } from "../../../sdk/interface/IUserConnection.js";
import users, { IUserMap, GetUserByDiscordId } from "../../../sdk/users.js";

export default async (req: Request, res: Response) => {
    let discordId = req.params['discordId'];

    var user = await GetUserByDiscordId(discordId);
    if (!user) {
        BuildResponse(res, HttpStatus.NotFound, ResponseErrorReasons.UserNotExists);
        return;
    }

    BuildResponse(res, HttpStatus.Success, user);
};
