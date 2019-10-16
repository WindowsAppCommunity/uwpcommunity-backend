import { Request, Response } from "express";
import { GetUser } from "../../../../common/helpers/discord";
import { BuildResponse, HttpStatus } from "../../../../common/helpers/responseHelper";
import { validateAuthenticationHeader, genericServerError } from "../../../../common/helpers/generic";
import { IDiscordUser } from "../../../../models/types";

module.exports = (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    GetUser(req.params['discordId']).then(user => {
        delete (user as any).lastMessageID;
        delete (user as any).lastMessage;
        BuildResponse(res, HttpStatus.Success, user as IDiscordUser);
    }).catch((err) => BuildResponse(res, HttpStatus.MalformedRequest, "Invalid discord ID: " + err));
}
