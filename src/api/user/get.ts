import { Request, Response } from "express";
import { getUserByDiscordId } from "../../common/helpers";

module.exports = (req: Request, res: Response) => {
    if (!req.query.accessToken) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query "accessToken" not provided or malformed`
        }));
        return;
    }

    getUserByDiscordId(req.query.accessToken)
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
