import { Request, Response } from "express";
var jwt = require('jsonwebtoken');

module.exports = (req: Request, res: Response) => {
    var secret = 'TOPSECRETTTTT';
    jwt.verify(req.query.token, secret, function(err: any, decoded: any ) {
        if(err){
            res.end(`Internal server error: ${err}`);
        }else{
            res.end("ok");
        }
      });

};