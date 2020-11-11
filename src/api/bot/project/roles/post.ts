import { Request, Response } from "express-serve-static-core";
import { GetGuildUser, GetGuild, GetDiscordUser, GetRoles } from "../../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader, capitalizeFirstLetter } from "../../../../common/helpers/generic";
import { getProjectsByDiscordId } from "../../../../models/Project";
import { HttpStatus, BuildResponse } from "../../../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const user = await GetDiscordUser(authAccess).catch((err) => genericServerError(err, res));
    if (!user) {
        BuildResponse(res, HttpStatus.Unauthorized, "Invalid accessToken");
        return;
    }

    const guildMember = await GetGuildUser(user.id);
    if (!guildMember) {
        genericServerError("Unable to get guild details", res);
        return;
    }

    const body = checkBody(req.body);
    if (typeof body == "string") {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${body}" not provided or malformed`);
        return;
    }

    // If trying to create a role for a project, make sure the project exists
    let Projects = await getProjectsByDiscordId(user.id);
    if (Projects.filter(project => req.body.appName == project.appName).length == 0) {
        BuildResponse(res, HttpStatus.MalformedRequest, "The project doesn't exist");
        return;
    }

    if (allowedProjectSubRoles.filter(subRole => req.body.subRole == subRole).length == 0) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Invalid project subRole. Allowed values are: "${allowedProjectSubRoles.join(`" , "`)}"`);
        return;
    }

    const server = await GetGuild();
    if (!server) return;

    const roleName = req.body.appName + " " + capitalizeFirstLetter(req.body.subRole);

    const serverRoles = await GetRoles();
    if (!serverRoles)
        return;

    // Check that the role doesn't already exist
    if (serverRoles.filter(role => role.name == roleName).length > 0) {
        BuildResponse(res, HttpStatus.Unauthorized, "Role already exists");
        return;
    }

    server.roles.create({
        data: {
            name: roleName,
            mentionable: true,
            color: req.body.color
        }
    });

    BuildResponse(res, HttpStatus.Success, "Success");
};

const allowedProjectSubRoles = ["translator", "dev", "beta tester"];

interface IPostProjectRoles {
    appName: "Cortana",
    subRole: "dev" | "beta tester" | "translator",
    color: string;
}

function checkBody(body: IPostProjectRoles): IPostProjectRoles | string {
    if (!body.appName) return "appName";
    if (!allowedProjectSubRoles.includes(body.subRole)) return "subRole";

    return body;
}