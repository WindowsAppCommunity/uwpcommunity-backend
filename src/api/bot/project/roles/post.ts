import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuild, GetDiscordUser } from "../../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { getProjectsByDiscordId } from "../../../../models/Project";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
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

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByDiscordId(user.id);
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
        name: roleName,
        mentionable: true,
        color: req.body.color
    });

    res.end("Success");
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];

function capitalizeFirstLetter(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}