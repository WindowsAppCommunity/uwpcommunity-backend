import { Response } from "express";

export enum Status {
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    MalformedRequest = 422,
    InternalServerError = 500,
    Success = 200,
}

export function BuildResponse(res: Response, status: Status, reasonString: string, errorString?: string): Response {
    res.status(status);
    if(errorString){
        res.send({
            error: errorString,
            reason: reasonString
        });
    }else{
        res.send(reasonString);
    }
    return res;
}