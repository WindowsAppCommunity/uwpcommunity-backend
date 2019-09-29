import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuildRoles, GetDiscordUser } from "../../../../common/helpers/discord";
import { Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { BuildResponse, Status } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, Status.Unauthorized, "Invalid accessToken");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Must have a role in the body (JSON)
    if (!req.body.role) {        
        BuildResponse(res, Status.MalformedRequest, "Missing role in body", "Malformed request");
        return;
    }

    let guildRoles = await GetGuildRoles();
    if (!guildRoles) {
        genericServerError("Unable to get guild roles", res); return;
    }

    let roles: Role[] = guildRoles.filter(role => role.name == req.body.role);
    if (roles.length == 0) InvalidRole(res);


    switch (req.body.role) {
        case "Developer":
            guildMember.addRole(roles[0]);
            BuildResponse(res, Status.Success, "Success");
            break;
        default:
            InvalidRole(res);
    }
};

function InvalidRole(res: Response) {
    BuildResponse(res, Status.MalformedRequest, "Invalid role", "Malformed request");
}