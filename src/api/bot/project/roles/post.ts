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

    let accessToken = req.headers.authorization.replace("Bearer ", "");

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

    // Must have a proper roles in the body (JSON)
    if (!req.body.appName) {
        res.status(422);
        res.end(`Missing appName`);
        return;
    }
    if (!req.body.subRole) {
        res.status(422);
        res.end(`Missing subRole`);
        return;
    }

    let roles: Role[] = guildMember.roles.array().map(role => { delete role.guild; return role });

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByUserDiscordId(user.id);
    if (Projects.filter(project => req.body.appName == project.appName).length == 0) {
        res.status(422);
        res.end(`The project doesn't exist`);
        return;
    }

    if (allowedProjectSubRoles.filter(subRole => req.body.subRole == subRole).length == 0) {
        res.status(422);
        res.end(`Invalid project subRole. Allowed values are: "${allowedProjectSubRoles.join(`" , "`)}"`);
        return;
    }

    const server = GetGuild();
    if (!server) return;

    const roleName = req.body.appName + " " + capitalizeFirstLetter(req.body.subRole);
    // Check that the role doesn't already exist
    if (server.roles.array().filter(role => role.name == roleName).length > 0) {
        res.status(401);
        res.end("Role already exists");
        return;
    }

    server.createRole({
        name: req.body.appName + " " + capitalizeFirstLetter(req.body.subRole),
        mentionable: true,
        color: req.body.color
    });

    res.end("Success");
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];
function capitalizeFirstLetter(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}