import express from "express";
import { Request, Response } from "express";
import validateJWT from "../api/validateJWT";
import TransApi from "../api/trans-api";

export default class TransRoutes {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.post('/trans/tocens', validateJWT, this.tocens);
        this.router.get('/trans/ballance', validateJWT, this.ballance);
        this.router.post('/trans/transfer', validateJWT, this.transfer);
    }

    private async tocens(req: Request, res: Response) {
        try {
            const response = await TransApi.Mint(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

    private async ballance(req: Request, res: Response) {
        try {
            const response = await TransApi.ballance(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

    private async transfer(req: Request, res: Response) {
        try {
            const response = await TransApi.transaction(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e?.status || 500).json(e);
        }
    }

}