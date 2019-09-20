import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuild } from "../../../../common/discord";
import { Role } from "discord.js";
import { genericServerError, GetDiscordUser, getProjectsByUserDiscordId } from "../../../../common/helpers";

module.exports = async (req: Request, res: Response) => {
    if (!req.headers.authorization) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Missing authorization header"
        }));
        return;
    }

    let accessToken = req.headers.authorization.replace("Bearer", "");

    const user = await GetDiscordUser(accessToken).catch((err) => genericServerError(err, res));
    if (!user) {
        res.status(401);
        res.end(`Invalid accessToken`);
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }
    // Must have a role in the body (JSON)
    if (!req.body.name) {
        res.status(422);
        res.end(`Missing role name`);
        return;
    }

    let roles: Role[] = guildMember.roles.array().map(role => { delete role.guild; return role });

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByUserDiscordId(user.id);
    if (Projects.filter(project => req.body.name.includes(project.appName)).length == 0) {
        res.status(422);
        res.end(`The project doesn't exist, or the role does not contain the project name`);
        return;
    }

    if (!checkAllowedProjectSubRoles(req.body.name)) {
        res.status(422);
        res.end(`Invalid project sub-role. Allowed values are: "${allowedProjectSubRoles.join(`" , "`)}"`);
        return;
    }

    const server = GetGuild();
    if (!server) return;

    server.createRole({
        name: req.body.name,
        mentionable: true,
        color: req.body.color
    });

    res.json(roles);
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];

function checkAllowedProjectSubRoles(roleName: string) {
    for (let SubRole in allowedProjectSubRoles) {
        if (roleName.toLowerCase().includes(SubRole)) return true;
    }
    return false;
}