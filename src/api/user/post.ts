import { Request, Response } from "express";
import User from "../../models/User"
import { IUser } from "../../models/types";

module.exports = (req: Request, res: Response) => {
    const body = req.body;
    body.discordId = req.query.accessToken;

    if (req.query.accessToken == undefined) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Query string "accessToken" not provided or malformed`
        }));
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck}" not provided or malformed`
        }));
        return;
    }

    submitProject(body)
        .then(results => {
            res.end("Success");
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });

};

function checkBody(body: IUser): true | string {
    if (!body.name) return "name";
    return true;
}

function submitProject(userData: IUser): Promise<User> {
    return new Promise<User>((resolve, reject) => {
        User.create({ ...userData })
            .then(resolve)
            .catch(reject);
    });
}

