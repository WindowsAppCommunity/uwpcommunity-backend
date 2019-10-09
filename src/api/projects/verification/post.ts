import { Request, Response } from "express";
import { match } from "../../../common/helpers/generic";
import fetch from "node-fetch";
import { verificationStorage } from "./verificationStore";
import sgMail from "@sendgrid/mail";

const api_key = process.env.SENDGRID_API_KEY;

if (!api_key) {
    console.error("Missing SENDGRID_API_KEY environment variable. Email verification will not work");
} else {
    sgMail.setApiKey(api_key);
}

module.exports = async (req: Request, res: Response) => {
    const checkedBody = checkBody(req.body);
    if (typeof checkedBody == "string") {
        res.status(422).send({
            error: "Malformed request",
            reason: `Query string "${checkedBody}" not provided or malformed`
        });
        return;
    }

    const supportEmail = await getSupportEmail(checkedBody.storeId, res);
    if (!supportEmail) return;

    // Random six digit code
    const verificationCode = Math.floor(Math.random() * (999999 - 111111) + 111111);

    verificationStorage.push({
        storeId: checkedBody.storeId,
        code: verificationCode
    });
    sendVerificationEmail(supportEmail, verificationCode);
    res.status(200).end();
};

async function sendVerificationEmail(emailAddress: string, code: number) {
    console.log(`Sending email to ${emailAddress}`);
    const msg = {
        to: emailAddress,
        from: 'noreply@uwpcommunity.github.io',
        subject: 'Project Verification - UWP Community',
        text: 'Your project verification code is ' + code
    };
    await sgMail.send(msg);
}

async function getSupportEmail(storeId: string, res: Response): Promise<string | undefined> {
    const initialScrape = await fetch(`https://www.microsoft.com/store/apps/${storeId}`);
    const storeScrapeResult = await initialScrape.text();

    if (storeScrapeResult.includes(`the page you requested cannot be found`)) {
        res.status(422).send({
            error: "Malformed request",
            reason: "Invalid storeId"
        });
        return;
    }

    const supportEmail = match(storeScrapeResult, /<a .* href="mailto:(.*?)" .*'>.* support<\/a>/);

    if (!supportEmail) {
        res.status(404).send({
            error: "Not found",
            reason: "Support email not present"
        });
        return;
    }

    return supportEmail;
}


function checkBody(query: IPostProjectsVerificationRequestBody): IPostProjectsVerificationRequestBody | string {
    if (!query.storeId) return "storeId";

    return query;
}
interface IPostProjectsVerificationRequestBody {
    /** @summary The store ID of a public app */
    storeId: string;
}