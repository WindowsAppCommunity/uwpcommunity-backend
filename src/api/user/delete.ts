import { Request, Response } from "express";
import { IDiscordUser } from "../../models/types";
import { getUserByDiscordId, getProjectsByUserDiscordId, GetDiscordUser, genericServerError } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        });
        return;
    }

    (async () => {
        const user = await GetDiscordUser(req.query.accessToken).catch((err) => genericServerError(err, res));
        if (!user) {
            res.status(401);
            res.end(`Invalid accessToken`);
            return;
        }

        let discordId = (user as IDiscordUser).id;

        deleteUser(discordId)
            .then(success => {
                if (success) {
                    res.end("Success");
                } else {
                    res.status(404);
                    res.json({
                        error: "Not found",
                        reason: `User does not exist in database`
                    });
                }
            })
            .catch((err) => genericServerError(err, res));
    })();
};

/**
 * @returns True if successful, false if user not found
 * @param user User to delete
 */
function deleteUser(discordId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        // Find the projects
        const projects = await getProjectsByUserDiscordId(discordId).catch(reject);

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
