import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../common/generic.js";
import { GetDiscordIdFromToken } from "../../common/discord.js";
import { HttpStatus, BuildResponse } from "../../common/responseHelper.js";
import { GetUserByDiscordId, SaveUserAsync } from "../../sdk/users.js";
import { IDiscordConnection } from "../../sdk/interface/IUserConnection.js";
import { IUser } from "../../sdk/interface/IUser.js";

export default async (req: Request, res: Response) => {
    const body = req.body as IPutUserRequestBody;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    let bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    let userMap = await GetUserByDiscordId(discordId);
    if (!userMap)
        throw new Error("User not found");

    // Combining the new data with old will overwrite arrays, so we populate them manually.
    body.connections = [...userMap.user.connections, ...body.connections, { discordId } as IDiscordConnection]
    body.links = [...userMap.user.links, ...body.links]
    body.projects = [...userMap.user.projects, ...body.projects]
    body.publishers = [...userMap.user.publishers, ...body.publishers]

    // Combine the new user data with the old user data, overwriting anything that exists.
    await SaveUserAsync(userMap.ipnsCid, { ...userMap.user, ...body });
    BuildResponse(res, HttpStatus.Success, "Success");
};

function checkBody(body: IPutUserRequestBody): true | string {
    if (!body.name) return "name";
    return true;
}

interface IPutUserRequestBody extends IUser { }