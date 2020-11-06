import { Request, Response } from "express";
import { GetUser } from "../../../../common/helpers/discord";
import { BuildResponse, HttpStatus } from "../../../../common/helpers/responseHelper";
import { validateAuthenticationHeader, genericServerError } from "../../../../common/helpers/generic";
import { User } from "discord.js";

module.exports = async (req: Request, res: Response) => {
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
