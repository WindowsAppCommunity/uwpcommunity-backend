import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetDiscordUser } from "../../../../common/helpers/discord";
import { Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { BuildErrorResponse, ErrorStatus, SuccessStatus, BuildSuccessResponse } from "../../../../common/helpers/responseHelper";
import { json } from "body-parser";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {        
        BuildErrorResponse(res, ErrorStatus.Unauthorized, "Invalid accessToken");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    let roles: Role[] = guildMember.roles.array().map(role => { delete role.guild; return role });

    BuildSuccessResponse(res, SuccessStatus.Success, JSON.stringify(roles));
};