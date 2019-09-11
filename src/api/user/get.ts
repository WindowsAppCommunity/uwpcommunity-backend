import { Request, Response } from "express";
import { getUserByDiscordId } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    if (!req.query.token) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query "token" not provided or malformed`
        }));
        return;
    }

    getUserByDiscordId(req.query.token)
        .then(results => {
            if (!results) {
                res.status(404);
                res.json(JSON.stringify({
                    error: "Not found",
                    reason: `User does not exist`
                }));
                return;
            }
            res.end(JSON.stringify(results))
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });
};
