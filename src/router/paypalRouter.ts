import express from "express";
import { Request, Response } from "express";
import axios from "axios";
import CustomError from "../CustomError";
import { tryGetCircle, tryGetUser } from "../api/commom";
import validateJWT from "../api/validateJWT";
import Paypal from "../database/models/Paypal";

export default class PayPalRouter {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes = () => {
        this.router.post('/paypal/add', validateJWT, this.addPaypal);
    }

    addPaypal = async (req: Request, res: Response) => {
        try {
            console.log(req.body);
            const { code, circleId, token } = req.body;
            let paypalApi = process.env.PAYPAL_API;

            if ( !code ) {
                throw new CustomError({
                    status: 400,
                    message: "Data incorrect"
                });
            }


            let getAccessToken = await axios.post(
                `${paypalApi}/v1/oauth2/token`,
                `grant_type=authorization_code&code=${code}`,
                {
                    auth: {
                        username: process.env.PAYPAL_CLIENT,
                        password: process.env.PAYPAL_SECRET
                    },
                    headers: {
                        "content-type": "text/plain",
                    }
                }
            );

            let refreshToken = getAccessToken.data.refresh_token;
            let accessToken = getAccessToken.data.access_token;
            //нужно ли еще дату окончания хранить?

            let getUserInfo = await axios.get(
                `${paypalApi}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, 
                {   
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    }
                }
            );

            if ( !circleId ) {
                var user = await tryGetUser(token?.verify?.user?.id); 

                let paypalObject = await Paypal.create(
                    {
                        payer_id: getUserInfo.data.payer_id,
                        access_token: accessToken,
                        refresh_token: refreshToken
                    }
                )

                await user.update({
                    paypalId: Number(paypalObject.id)
                });

            } else {
                var circle = await tryGetCircle(circleId);

                if (circle.organizerId != token?.verify?.user?.id) {
                    throw new CustomError({
                        status: 403,
                        message: "You haven't got enough permissions to do it"
                    });
                }

                let paypalObject = await Paypal.create(
                    {
                        payer_id: getUserInfo.data.payer_id,
                        access_token: accessToken,
                        refresh_token: refreshToken
                    }
                )

                await circle.update({
                    paypalId: Number(paypalObject.id)
                });
            }

            res.status(200).json({
                message: "ok",
                user,
                circle
            });

        } catch (error) {
            console.log(error);
            res.status( error?.status || 500 ).json( error?.message )
        }
    }
}
