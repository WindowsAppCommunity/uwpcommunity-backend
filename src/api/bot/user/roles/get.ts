import { Request, Response } from "express-serve-static-core";
import { GetGuildUser } from "../../../../common/discord";
import { Role } from "discord.js";
import { genericServerError, GetDiscordUser } from "../../../../common/helpers";

module.exports = async (req: Request, res: Response) => {
    if (!req.headers.authorization) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Missing authorization header"
        }));
        return;
    }

    let accessToken = req.headers.authorization.replace("Bearer ", "");

    const user = await GetDiscordUser(accessToken).catch((err) => genericServerError(err, res));
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

    let roles: Role[] = guildMember.roles.array().map(role => { delete role.guild; return role });

    res.json(roles);
};