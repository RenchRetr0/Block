import { NextFunction, Request, Response } from "express";
import AuthApi, { ValidateJWTResponse } from "./user-api";
import CustomError from "../CustomError";

export default async function validateJWT(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req?.headers?.authorization?.split(" ")[1];
        if (!token) {
            throw new CustomError({
                status: 404,
                message: "Token not defined.",
            });
        }
        const response: ValidateJWTResponse = await AuthApi.validateJwt({
            token: token,
        });

        req.body.token = response;
        next();
    } catch (e) {
        console.log(e);
        res.status(e?.status || 500).json(e);
    }
}
