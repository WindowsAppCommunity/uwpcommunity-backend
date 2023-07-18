import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetDiscordUser, GetRoles } from "../../../../../common/discord.js";
import { Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../../common/generic.js";
import { BuildResponse, HttpStatus, } from "../../../../../common/responseHelper.js";

export default async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, HttpStatus.Unauthorized, "Invalid accessToken");
        return;
    }

    if (req.params['discordId'] !== user.id) {
        BuildResponse(res, HttpStatus.Unauthorized, "Authenticated user and requested ID don't match");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Must have a role in the body (JSON)
    if (!req.body.name) {
        BuildResponse(res, HttpStatus.Unauthorized, "Missing role name");
        return;
    }

    // Check that the user has the role
    let roles: Role[] = [...guildMember.roles.cache.filter(role => role.name == req.body.role).values()];
    if (roles.length == 0) InvalidRole(res);

    switch (req.body.name) {
        case "Developer":
            guildMember.roles.remove(roles[0]);
            BuildResponse(res, HttpStatus.Success, "Success");
            break;
        default:
            InvalidRole(res);
    }
};

function InvalidRole(res: Response) {
    BuildResponse(res, HttpStatus.MalformedRequest, "Invalid role");
}