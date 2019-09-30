import { Request, Response } from "express";
import { match } from "../../../../common/helpers/generic";
import fetch from "node-fetch";

module.exports = async (req: Request, res: Response) => {
    const checkedQuery = checkQuery(req.query);
    if (typeof checkedQuery == "string") {
        res.status(422).send({
            error: "Malformed request",
            reason: `Query string "${checkedQuery}" not provided or malformed`
        });
        return;
    }


    const initialScrape = await fetch(`https://www.microsoft.com/store/apps/${checkedQuery.storeId}`);
    const scrapeResult = await initialScrape.text();

    if (scrapeResult.includes(`the page you requested cannot be found`)) {
        res.status(422).send({
            error: "Malformed request",
            reason: "Invalid storeId"
        });
        return;
    }

    const supportEmail = match(scrapeResult, /<a .* href="(mailto:.*?)" .*'>.* support<\/a>/);

    if (!supportEmail) {
        res.status(404).send({ 
            error: "Not found",
            reason: "Support email not present"
         });
        return;
    }

    res.send(supportEmail);
};

function checkQuery(query: IGetMsstoreSupportemailRequestQuery): IGetMsstoreSupportemailRequestQuery | string {
    if (!query.storeId) return "storeId";

    return query;
}
interface IGetMsstoreSupportemailRequestQuery {
    /** @summary The store ID of a public app */
    storeId: string;
}