import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuild, GetDiscordUser } from "../../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { getProjectsByDiscordId } from "../../../../models/Project";
import { Error422Response, Error401Response, EndSuccess } from "../../../../common/helpers/responseHelper";

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

    // Must have a proper roles in the body (JSON)
    if (!req.body.appName) {
        Error422Response(res, `Missing appName`);
        return;
    }
    if (!req.body.subRole) {
        Error422Response(res, `Missing subRole`);
        return;
    }

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByDiscordId(user.id);
    if (Projects.filter(project => req.body.appName == project.appName).length == 0) {
        Error422Response(res, `The project doesn't exist`);
        return;
    }

    if (allowedProjectSubRoles.filter(subRole => req.body.subRole == subRole).length == 0) {
        Error422Response(res, `Invalid project subRole. Allowed values are: "${allowedProjectSubRoles.join(`" , "`)}"`);
        return;
    }

    const server = GetGuild();
    if (!server) return;

    const roleName = req.body.appName + " " + capitalizeFirstLetter(req.body.subRole);
    // Check that the role doesn't already exist
    if (server.roles.array().filter(role => role.name == roleName).length > 0) {
        Error401Response(res, "Role already exists");
        return;
    }

    server.createRole({
        name: roleName,
        mentionable: true,
        color: req.body.color
    });

    EndSuccess(res);
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];

function capitalizeFirstLetter(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}