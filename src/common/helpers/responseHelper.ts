import { Response } from "express";

export enum HttpStatus {
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    MalformedRequest = 422,
    InternalServerError = 500,
    Success = 200
}

export function BuildResponse(res: Response, status: HttpStatus, body?: string | object): Response {
    if (status === HttpStatus.Success) {
        SendResponse(res, status, body);
    } else {
        SendResponse(res, status, {
            error: HttpStatus[status],
            reason: body
        });
    }

    return res;
}

function SendResponse(res: Response, status: any, body: any): Response {
    res.status(status);
    res.send(body);
    return res;
}