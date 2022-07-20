import express, { response } from "express";
import { Request, Response } from "express";
import UserApi from "../api/user-api";

export default class UserRoutes {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.post('/user/signUp', this.signUp);
        this.router.post('/user/signIn', this.signIn);
    }

    private async signUp(req: Request, res: Response) {
        try {
            const response = await UserApi.signUp(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

    private async signIn(req: Request, res: Response) {
        try {
            console.log(req.body);
            const response = await UserApi.signIn(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

}