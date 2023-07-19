import { Request, Response } from "express";
import { ResponseErrorReasons } from "../../models/types.js";
import { validateAuthenticationHeader } from "../../common/generic.js";
import { GetDiscordIdFromToken } from "../../common/discord.js";
import { BuildResponse, HttpStatus } from "../../common/responseHelper.js";
import { GetUserByDiscordId, SaveUserAsync } from "../../sdk/users.js";
import { CreateLibp2pKey } from "../../sdk/helia.js";
import { IUser } from "../../sdk/interface/IUser.js";
import { IDiscordConnection } from "../../sdk/interface/IUserConnection.js";

export default async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (discordId == undefined)
        return;

    // Check if the user already exists
    const user = await GetUserByDiscordId(discordId);
    if (user) {
        BuildResponse(res, HttpStatus.BadRequest, ResponseErrorReasons.UserExists);
        return;
    }

    // Add the discord connection to the new user
    body.connections = [...body.connections, { discordId } as IDiscordConnection]

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    // Create the user
    var peerId = await CreateLibp2pKey();
    await SaveUserAsync(peerId.toCID(), body);

    BuildResponse(res, HttpStatus.Success, "Success");
};

function checkBody(body: IPostUserRequestBody): true | string {
    if (!body.name) return "name";
    return true;
}


interface IPostUserRequestBody extends IUser {
}