import { Request, Response } from "express";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { getUserByDiscordId } from "../../models/User";
import { getProjectsByDiscordId } from "../../models/Project";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { NotFound, EndSuccess } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;
    
    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    deleteUser(discordId)
        .then(success => {
            if (success) {
                EndSuccess(res);
            } else {
                NotFound(res, `User does not exist in database`);
            }
        })
        .catch((err) => genericServerError(err, res));
};

/**
 * @returns True if successful, false if user not found
 * @param user User to delete
 */
function deleteUser(discordId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        // Find the projects
        const projects = await getProjectsByDiscordId(discordId).catch(reject);

        if (!projects) return;

        // Delete all associated projects with this user
        for (let project of projects) {
            await project.destroy().catch(reject);
        }

        // Find the user
        const userOnDb = await getUserByDiscordId(discordId).catch(reject);
        if (!userOnDb) { resolve(false); return; }

        // Delete the user
        await userOnDb.destroy().catch(reject);
        resolve(true);
    });
}
