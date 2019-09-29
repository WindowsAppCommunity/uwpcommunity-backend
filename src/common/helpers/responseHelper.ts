import { Response } from "express";

export enum ErrorStatus {
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    MalformedRequest = 422,
    InternalServerError = 500
}

export enum SuccessStatus {
    Success = 200
}

export function BuildErrorResponse(res: Response, status: ErrorStatus, reasonString: string): Response {
    let errorString = undefined;

    switch (status) {
        case ErrorStatus.BadRequest:
            errorString = "Bad request";
            break;
        case ErrorStatus.Unauthorized:
            errorString = "Unauthorized";
            break;
        case ErrorStatus.NotFound:
            errorString = "Not Found";
            break;
        case ErrorStatus.MalformedRequest:
            errorString = "Malformed request";
            break;
        case ErrorStatus.InternalServerError:
            errorString = "Internal Server Error";
            break;
    }

    SendResponse(res, ErrorStatus, {
        error: errorString,
        reason: reasonString
    });
    return res;
}

export function BuildSuccessResponse(res: Response, status: SuccessStatus, body: string): Response {
    SendResponse(res, ErrorStatus, body);
    return res;
}

function SendResponse(res: Response, status: any, body: any): Response {
    res.status(status);
    res.send(body);
    return res;
}