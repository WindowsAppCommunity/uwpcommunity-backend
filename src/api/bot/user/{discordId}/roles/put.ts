import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetRoles, GetDiscordUser, GetUser } from "../../../../../common/discord.js";
import { DiscordAPIError, Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../../common/generic.js";
import { BuildResponse, HttpStatus } from "../../../../../common/responseHelper.js";

export default async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, HttpStatus.Unauthorized, "Invalid accessToken");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild member details", res);
        return;
    }


    if (req.params['discordId'] !== user.id) {
        // If these are mismatched but the user has permission to edit roles, allow it
        if (!guildMember.permissions.has(["ManageRoles"])) {
            // If the user is a launch coordinator and is try to assign a launch participant, allow it
            if (!(guildMember.roles.cache.find(r => r.name == "Launch Coordinator") && req.body.role == "Launch Participant")) {
                BuildResponse(res, HttpStatus.Unauthorized, "Authenticated user and requested ID don't match");
                return;
            }
        }
    }

    // Must have a role in the body (JSON)
    if (!req.body.role) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Missing role in body");
        return;
    }

    let guildRoles = await GetRoles();
    if (!guildRoles) {
        genericServerError("Unable to get guild roles", res); return;
    }

    let roles: Role[] = guildRoles.filter(role => role.name == req.body.role);
    if (roles.length == 0) InvalidRole(res);

    switch (req.body.role) {
        case "Developer":
        case "Launch Participant":
            guildMember.roles.add(roles[0]);
            BuildResponse(res, HttpStatus.Success, "Success");
            break;
        default:
            InvalidRole(res);
    }

};

function InvalidRole(res: Response) {
    BuildResponse(res, HttpStatus.MalformedRequest, "Invalid role");
}