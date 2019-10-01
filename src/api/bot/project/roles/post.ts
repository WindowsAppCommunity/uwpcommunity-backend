import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuild, GetDiscordUser } from "../../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader } from "../../../../common/helpers/generic";
import { getProjectsByDiscordId } from "../../../../models/Project";
import { ErrorStatus, BuildErrorResponse, BuildSuccessResponse, SuccessStatus } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildErrorResponse(res, ErrorStatus.Unauthorized, "Invalid accessToken");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    // Must have a proper roles in the body (JSON)
    if (!req.body.appName) {        
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, "Missing appName");
        return;
    }
    if (!req.body.subRole) {
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, "Missing subRole");
        return;
    }

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByDiscordId(user.id);
    if (Projects.filter(project => req.body.appName == project.appName).length == 0) {
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, "The project doesn't exist");
        return;
    }

    if (allowedProjectSubRoles.filter(subRole => req.body.subRole == subRole).length == 0) {        
        BuildErrorResponse(res, ErrorStatus.MalformedRequest, `Invalid project subRole. Allowed values are: "${allowedProjectSubRoles.join(`" , "`)}"`);
        return;
    }

    const server = GetGuild();
    if (!server) return;

    const roleName = req.body.appName + " " + capitalizeFirstLetter(req.body.subRole);
    // Check that the role doesn't already exist
    if (server.roles.array().filter(role => role.name == roleName).length > 0) {
        BuildErrorResponse(res, ErrorStatus.Unauthorized, "Role already exists");
        return;
    }

    server.createRole({
        name: roleName,
        mentionable: true,
        color: req.body.color
    });

    BuildSuccessResponse(res, SuccessStatus.Success, "Success");
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];

function capitalizeFirstLetter(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}