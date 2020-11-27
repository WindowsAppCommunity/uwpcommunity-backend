import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../../../../common/helpers/generic";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.params as IGetProjectTagRequestQuery;
    
    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    
};


interface IGetProjectTagRequestQuery {
    id?: string;
}