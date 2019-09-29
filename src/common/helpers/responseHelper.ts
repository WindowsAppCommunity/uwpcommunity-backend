import { Response } from "express";

export enum Status {
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    MalformedRequest = 422,
    InternalServerError = 500,
    Success = 200,
}

export function BuildResponse(res: Response, status: Status, reasonString: string): Response {
    let errorString = undefined;

    switch (status) {
        case Status.BadRequest:
            errorString = "Bad request";
            break;
        // TODO: ???
        // case Status.Unauthorized:
        //     errorString = "";
        //     break;
        case Status.NotFound:
            errorString = "Not Found";
            break;
        case Status.MalformedRequest:
            errorString = "Malformed request";
            break;
        // TODO: ???
        // case Status.InternalServerError:
        //     errorString = "";
        //     break;
    }

    SendResponse(res, status, reasonString, errorString);
    return res;
}

function SendResponse(res: Response, status: Status, reasonString: string, errorString?: string): Response {
    res.status(status);
    if (errorString) {
        res.send({
            error: errorString,
            reason: reasonString
        });
    } else {
        res.send(reasonString);
    }
    return res;
}