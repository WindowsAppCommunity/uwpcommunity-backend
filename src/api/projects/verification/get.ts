import { Request, Response } from "express";
import { match, genericServerError } from "../../../common/helpers/generic";
import fetch from "node-fetch";
import { verificationStorage } from "./verificationStore";
import sgMail from "@sendgrid/mail";

const api_key = process.env.SENDGRID_API_KEY;

if (!api_key) {
    throw new Error("Missing SENDGRID_API_KEY environment variable. Email verification will not work");
} else {
    sgMail.setApiKey(api_key);
}

module.exports = async (req: Request, res: Response) => {
    const checkedQuery = checkQuery(req.query);
    if (typeof checkedQuery == "string") {
        res.status(422).send({
            error: "Malformed request",
            reason: `Query string "${checkedQuery}" not provided or malformed`
        });
        return;
    }

    for (let store of verificationStorage) {
        if (store.storeId == checkedQuery.storeId && store.code == checkedQuery.code) {
            var index = verificationStorage.indexOf(store);
            
            if (index > -1) {
                verificationStorage.splice(index, 1);
            } else {
                genericServerError("Error occured while cleaning up data for this project", res);
                return;
            }
            res.status(200).end();
            return;
        }
    }

    res.status(400).send({
        error: "Invalid Request",
        reason: `Invalid storeId or code`
    });
};


function checkQuery(query: IGetProjectsVerificationRequestQuery): IGetProjectsVerificationRequestQuery | string {
    if (!query.storeId) return "storeId";
    if (!query.code) return "code";

    return query;
}
interface IGetProjectsVerificationRequestQuery {
    /** @summary The store ID of a public app */
    storeId: string;
    /** @summary Verification code to check for */
    code: number;
}