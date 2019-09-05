import { Request, Response } from "express";
import User from "../../../../models/User"
import Project from "../../../../models/Project";
import { IQueryResult } from "../../../../common/iQueryResult";
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
    const bodyCheck: true | (string | boolean)[] = checkBody(body);

    if (!bodyCheck || bodyCheck instanceof Array && bodyCheck[0] === false) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: `Parameter "${bodyCheck[1]}" not provided or malformed`
        }));
        return;
    }

    submitParticipant(body, (results: IQueryResult) => {
        res.end(JSON.stringify(results));
    });
};

function checkBody(body: IParticipantRequest) {
    if (!body.name) return [false, "name"];
    if (!body.email) return [false, "email"];
    if (!body.discord) return [false, "discord"];

    if (!body.appName) return [false, "appName"];
    if (!body.description) return [false, "description"];
    if (body.isPrivate == undefined) return [false, "isPrivate"];

    return true;
}

function submitParticipant(participantData: IParticipantRequest, cb: Function) {
    Project.create({
        appName: participantData.appName,
        description: participantData.description,
        isPrivate: participantData.isPrivate,
        user: {
            name: participantData.name,
            email: participantData.email,
            discord: participantData.discord
        },
        launchId: currentLaunchYearDbId
    }, {
            include: [User]
        }).then((results) => {
            cb(JSON.stringify(results));
        }).catch((ex) => {
            console.log(ex)
        });
}
