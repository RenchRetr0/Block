import express from "express";
import { Request, Response } from "express";
import File from "../api/file";

export default class ImageRouter {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.use(express.static("public"));
        this.router.post("/image/upload", this.uploadImage);
        this.router.post("/image/delete", this.deleteImage);
    }

    public async uploadImage(req: Request, res: Response) {
        try {
            const file = new File();
            const response = await file.uploadFile(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            res.status(e.status || 500).json(e);
        }
    }

    public async deleteImage(req: Request, res: Response) {
        try {
            const file = new File();
            const response = await file.deleteFile(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json(e);
        }
    }
}
