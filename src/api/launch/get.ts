import { Request, Response } from "express";
import User from "../../models/User";
import Launch from "../../models/Launch";
import Project from "../../models/Project";

module.exports = (req: Request, res: Response) => {
    if (!req.query.year) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Year parameter not specified"
        }));
        return;
    }

    getLaunchTable(req.query.year, res, (results: string) => {
        res.end(results);
    });
};

function getLaunchTable(year: number, res: Response, cb: Function) {
    Project
        .findAll(
            {
                include: [
                    {
                        model: Launch,
                        where: { year: year }
                    },
                    User]
            }
        )
        .then(launch => {
            cb(JSON.stringify(launch));
        });
}