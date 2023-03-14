import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetDiscordUser } from "../../../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader, DEVENV } from "../../../../../common/helpers/generic";
import { BuildResponse, HttpStatus, } from "../../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, HttpStatus.Unauthorized, "Invalid accessToken");
        return;
    }
    
    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Using "as any" here to silence the compiler warning that the role.guild object must be optional if deleting it.
    // This is only fine because data is immediately used as the response.
    let roles = guildMember.roles.cache.map(role => { delete (role as any).guild; return role });
    BuildResponse(res, HttpStatus.Success, roles);
};