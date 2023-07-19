import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../../../common/generic.js";
import { GetDiscordIdFromToken } from "../../../../common/discord.js";
import { HttpStatus, BuildResponse } from "../../../../common/responseHelper.js";
import { LoadProjectAsync } from "../../../../sdk/projects.js";
import type { CID } from "multiformats/cid";
import { LoadUserAsync } from "../../../../sdk/users.js";
import { IDiscordConnection } from "../../../../sdk/interface/IUserConnection.js";
import { IProject } from "../../../../sdk/interface/IProject.js";

export default async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectRequestQuery;

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const authenticatedDiscordId = await GetDiscordIdFromToken(authAccess, res);

    if (authenticatedDiscordId && reqQuery.id) {
        let project : IProject | undefined = await LoadProjectAsync(reqQuery.id)

        if (project.isPrivate) {
            let showPrivate = false;
            
            for (const collaborator of project.collaborators) {
                const user = await LoadUserAsync(collaborator.user);
                
                for (var connection of user.connections) {
                    if ((connection as IDiscordConnection)?.discordId == authenticatedDiscordId) {
                        showPrivate = true;
                    }
                }
            }

            if (!showPrivate) {
                project = undefined;
            }

        }

        BuildResponse(res, HttpStatus.Success, project);
    }
};

interface IGetProjectRequestQuery {
    id?: CID;
}