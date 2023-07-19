import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../../../common/generic.js";
import { GetDiscordIdFromToken } from "../../../../common/discord.js";
import { HttpStatus, BuildResponse } from "../../../../common/responseHelper.js";
import { GetProjectsByDiscordId } from "../../../../sdk/projects.js";

export default async (req: Request, res: Response) => {
    let discordId = req.params['discordId'];

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);

    if (authenticatedDiscordId) {
        var results = await GetProjectsByDiscordId(discordId, authenticatedDiscordId);

        BuildResponse(res, HttpStatus.Success, results);
    }
};

interface IGetProjectsRequestQuery {
    discordId?: string;
}
