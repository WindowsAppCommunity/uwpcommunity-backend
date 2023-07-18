import { Request, Response } from "express";
import { GetUser } from "../../../../common/discord.js";
import { BuildResponse, HttpStatus } from "../../../../common/responseHelper.js";
import { validateAuthenticationHeader, genericServerError } from "../../../../common/generic.js";
import { User } from "discord.js";

export default async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetUser(req.params['discordId']).catch((err) => BuildResponse(res, HttpStatus.MalformedRequest, "Invalid discord ID: " + err));

    if (!user) {
        BuildResponse(res, HttpStatus.InternalServerError, "Couldn't get user.");
        return;
    }

    delete (user as any).lastMessageID;
    delete (user as any).lastMessage;
    BuildResponse(res, HttpStatus.Success, user as User);
}
