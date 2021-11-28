import { Request, Response } from "express";

module.exports = (req: Request, res: Response) => {
    console.log("received");
    res.status(200);
}
