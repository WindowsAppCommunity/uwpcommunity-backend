import { Request, Response } from "express";
import { genericServerError, validateAuthenticationHeader } from "../../common/generic.js";
import { GetDiscordIdFromToken } from "../../common/discord.js";
import { DeleteUserByDiscordId } from "../../sdk/users.js";

export default async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    await DeleteUserByDiscordId(discordId).catch((err) => genericServerError(err, res));
};
