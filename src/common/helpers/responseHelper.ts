import { Response } from "express";

enum Status {
    Error400 = 400,
    Error401 = 401,
    Error404 = 404,
    Error422 = 422,
    Error500 = 500,
    Success200 = 200,
}

export function BadRequest(res: Response, reasonString: string): Response {
    return JsonResponse(res, Status.Error400, "Bad request", reasonString);
}

export function Error401Response(res: Response, reasonString: string): Response {
    return EndResponse(res, Status.Error401, reasonString);
}

export function NotFound(res: Response, reasonString: string): Response {
    return JsonResponse(res, Status.Error404, "Not Found", reasonString);
}

export function MalformedRequest(res: Response, reasonString: string): Response {
    return JsonResponse(res, Status.Error422, "Malformed request", reasonString);
}

export function Error422Response(res: Response, reasonString: string): Response {
    return EndResponse(res, Status.Error422, reasonString);
}

export function Error500Response(res: Response, reasonString: string): Response {
    return EndResponse(res, Status.Error500, `Internal server error: ${reasonString}`);
}

export function Success(res: Response): Response {
    return SendResponse(res, Status.Success200, "Success");
}

export function EndSuccess(res: Response): Response {
    res.end("Success");
    return res;
}

export function SendSuccess(res: Response): Response {
    res.send("Success");
    return res;
}


function JsonResponse(res: Response, status: Status, errorString: string, reasonString: string): Response {
    res.status(status);
    res.json({
        error: errorString,
        reason: reasonString
    });
    return res;
}

function EndResponse(res: Response, status: Status, reasonString: string): Response {
    res.status(status);
    res.end(reasonString);
    return res;
}

function SendResponse(res: Response, status: Status, reasonString: string): Response {
    res.status(status);
    res.send(reasonString);
    return res;
}