import { Request, Response } from "express-serve-static-core";
import { GetGuildUser } from "../../../../common/discord";
import { Role } from "discord.js";
import { genericServerError } from "../../../../common/helpers";

module.exports = async (req: Request, res: Response) => {
    let discordId = req.query.discordId;

    if (!discordId) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Missing discordId query"
        }));
        return;
    }

    const guildMember = await GetGuildUser(discordId);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    let roles: Role[] = guildMember.roles.array().map(role => { delete role.guild; return role });

    res.json(roles);
};