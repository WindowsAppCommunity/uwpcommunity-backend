import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetDiscordUser } from "../../../../common/helpers/discord";
import { Role } from "discord.js";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        res.status(401);
        res.end(`Invalid access token`);
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Must have a role in the body (JSON)
    if (!req.body.name) {
        res.status(401);
        res.end(`Missing role name`);
        return;
    }

    // Check that the user has the role
    let roles: Role[] = guildMember.roles.array().filter(role => role.name == req.body.role);
    if (roles.length == 0) InvalidRole(res);

    switch (req.body.name) {
        case "Developer":
            guildMember.removeRole(roles[0]);
            res.send("Success");
            break;
        default:
            InvalidRole(res);
    }
};

function InvalidRole(res: Response) {
    res.status(422);
    res.json({
        error: "Malformed request",
        reason: "Invalid role"
    });
}