import { Request, Response } from "express";

export default (req: Request, res: Response) => {
    console.log("received");
    res.status(200);
}
