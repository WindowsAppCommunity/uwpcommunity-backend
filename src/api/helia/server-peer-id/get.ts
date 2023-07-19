import { Request, Response } from "express";
import { Helia } from "../../../sdk/helia.js";
import { BuildResponse } from "../../../common/responseHelper.js";


export default (req: Request, res: Response) => BuildResponse(res, 200, Helia?.libp2p.peerId?.toCID());
