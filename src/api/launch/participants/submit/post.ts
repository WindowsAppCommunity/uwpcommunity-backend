import { Request, Response } from "express";
import User from "../../../../models/User"
import Project from "../../../../models/Project";
import { getLaunchTable } from "../get";

const possibleLaunchYears = [2019, 2020]; // Maybe possible to pull these directly from the DB as key value pairs?
const currentLaunchYearDbId = possibleLaunchYears.indexOf(2020);

interface IParticipantRequest {
    name: string;
    email: string;
    discord: string;

    appName: string;
    description: string;
    isPrivate: boolean;
};

module.exports = (req: Request, res: Response) => {
    const body = req.body;
    const bodyCheck = checkBody(body);

    if (!bodyCheck || bodyCheck instanceof Array && bodyCheck[0] === false) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck[1]}" not provided or malformed`
        }));
        return;
    }

    submitParticipant(body)
        .then(results => {
            getLaunchTable(possibleLaunchYears[currentLaunchYearDbId], res, ()=>{
                // cache the new data
            });
            res.end(JSON.stringify(results))
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });

};

function checkBody(body: IParticipantRequest): true | (string | boolean)[] {
    if (!body.name) return [false, "name"];
    if (!body.email) return [false, "email"];
    if (!body.discord) return [false, "discord"];

    if (!body.appName) return [false, "appName"];
    if (!body.description) return [false, "description"];
    if (body.isPrivate == undefined) return [false, "isPrivate"];

    return true;
}

function submitParticipant(participantData: IParticipantRequest): Promise<Project> {
    return new Promise<Project>((resolve, reject) => {
        Project.create(
            {
                appName: participantData.appName,
                description: participantData.description,
                isPrivate: participantData.isPrivate,
                user: {
                    name: participantData.name,
                    email: participantData.email,
                    discord: participantData.discord
                },
                launchId: currentLaunchYearDbId
            },
            {
                include: [User]
            })
            .then(resolve)
            .catch(reject);
    });
}

