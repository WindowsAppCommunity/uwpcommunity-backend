import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetDiscordUser } from "../../../../common/helpers/discord";
import { Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { MalformedRequest, Error401Response, SendSuccess } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        Error401Response(res, `Invalid accessToken`);
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Must have a role in the body (JSON)
    if (!req.body.name) {
        Error401Response(res, `Missing role name`);
        return;
    }

    // Check that the user has the role
    let roles: Role[] = guildMember.roles.array().filter(role => role.name == req.body.role);
    if (roles.length == 0) InvalidRole(res);

    switch (req.body.name) {
        case "Developer":
            guildMember.removeRole(roles[0]);
            SendSuccess(res);
            break;
        default:
            InvalidRole(res);
    }
};

function InvalidRole(res: Response) {    
    MalformedRequest(res, "Invalid role");        
}