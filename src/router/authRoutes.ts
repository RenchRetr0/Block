import express from "express";
import { Request, Response } from "express";
import AuthApi from "../api/auth-api";
import CustomError from "../CustomError";
import validateJWT from "../api/validateJWT";

export default class AuthRoutes {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.post('/auth/sign-up', this.signUp);
        this.router.post('/auth/sign-in', this.signIn);
        this.router.get('/auth/verify', this.verifyMail);
        this.router.post('/auth/validate-jwt', this.validateJWT);
        this.router.delete('/auth/delete', validateJWT,  this.deleteUser);
        this.router.post(
            "/auth/changePassword",
            validateJWT,
            this.changePassword
        );
        this.router.post('/auth/call-reset-password', this.callResetPassword);
        this.router.post('/auth/reset-password', this.resetPassword);
        this.router.post('/auth/mintSignUp', this.mintSignUp.bind(this));
        this.router.post('/auth/change-email-request', validateJWT, this.changeEmailRequest);
        this.router.post('/auth/change-email', validateJWT, this.changeEmail);
    }

    
    private async mintSignUp(req: Request, res: Response) {
        try {
            if (req?.headers?.authorization) {
                throw new CustomError({
                    status: 403,
                    message: "This route is for unauthorized users only",
                });
            }
            const response = await AuthApi.registrationForMint(
                req.body.name,
                req.body.email,
                req.body.ppAccept,
                req.body.newsLetter
                );
                res.status(response.status).json(response);
            } catch (e) {
                console.log(e);
                res.status(e.status || 500).json({ message: e.message });
            }
        }
        
    /* 
        =============================
        ======== Регистрация ========
        =============================
    */
   
    private async signUp(req: Request, res: Response) {
        try {
            const response = await AuthApi.signUp(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

    private async signIn(req: Request, res: Response) {
        try {
            const response = await AuthApi.signIn(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

    private async verifyMail(req: Request, res: Response) {
        try {
            const response = await AuthApi.validate({
                token: req?.query?.token as string,
            });
            res.status(response.status).json(response);
        } catch (e) {
            res.status(e?.status || 500).json(e);
        }
    }

    private async validateJWT(req: Request, res: Response) {
        try {
            const token = req?.headers?.authorization?.split(" ")[1];
            if (!token) {
                throw new CustomError({
                    status: 404,
                    message: "Token not defined.",
                });
            }
            const response = await AuthApi.validateJwt({
                token: token,
            });
            res.status(response.status).json(response);
        } catch (e) {
            res.status(e?.status || 500).json(e);
        }
    }

    private async deleteUser(req: Request, res: Response) {
        try {
            const { userId }: { userId: number | string } = req.body;
            const response = await AuthApi.deleteUser(userId);
            res.status(response.status).json(response.message);
        } catch (e) {
            res.status(e?.status || 500).json(e.message);
        }
    }

    private async changePassword(req: Request, res: Response) {
        try {
            const response = await AuthApi.changePassword(req.body);
            res.status(response.status).json(response.message);
        } catch (e) {
            console.error(e);
            res.status(e?.status || 500).json(e.message);
        }
    }

    private async callResetPassword(req: Request, res: Response) {
        try {
            const response = await AuthApi.callResetPassword(req.body);
            res.status(response.status).json(response.message);
        } catch (error) {
            console.error(error);
            res.status(error?.status || 500).json(error.message);
        }
    }

    private async resetPassword(req: Request, res: Response) {
        try {
            const response = await AuthApi.resetPassword(req.body);
            res.status(200).json(response);
        } catch (error) {
            console.error(error);
            res.status(error?.status || 500).json(error.message);
        }
    }

    private async changeEmailRequest( req: Request, res: Response ) {
        try {
            const response = await AuthApi.changeEmailRequest(req.body);
            res.status(200).json(response);
        } catch (error) {
            console.error(error);
            res.status(error?.status || 500).json(error.message);
        }
    }

    private async changeEmail( req: Request, res: Response ) {
        try {
            const response = await AuthApi.changeEmail(req.body);
            res.status(200).json(response);
        } catch (error) {
            console.error(error);
            res.status(error?.status || 500).json(error.message);
        }
    }
}
