import { Request, Response } from "express";
var jwt = require('jsonwebtoken');

module.exports = (req: Request, res: Response) => {
    var secret = 'TOPSECRETTTTT';

    var now = Math.floor(Date.now() / 1000),
        iat = (now - 10),
        expiresIn = 3600,
        expr = (now + expiresIn),
        notBefore = (now - 10),
        jwtId = Math.random().toString(36).substring(7);

    var payload = {
        iat: iat,
        jwtid: jwtId,
        audience: 'TEST',
        data: "data"
    };

    jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: expiresIn }, function (err: any, token: boolean) {

        if (err) {
            console.log('Error occurred while generating token');
            console.log(err);
            return false;
        }
        else {
            if (token != false) {
                res.json({
                    "results":
                        { "status": "true" },
                    "token": token,
                    "data": "results"

                });
                res.end();
            }
            else {
                res.send("Could not create token");
                res.end();
            }
        }
    });

};