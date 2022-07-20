import express, { Router } from "express";
import { Request, Response } from "express";
import { ApplicationError } from "./ApplicationError";
import { HTTPStatus } from "../utils";


export default abstract class BaseRouter {
    public router: Router = express.Router();

    protected failable(f: (req: Request, res: Response) => Promise<any>) {
        return async function (req: Request, res: Response) {
            try {
                await f(req, res);
            } catch (e) {
                console.error("error", e);
                if (e instanceof ApplicationError) {
                    res.status(e.status).json({ message: e.message });
                } else if (JSON.stringify(e) === "{}") {
                    res.status(HTTPStatus.INTERNAL).json({ message: e.message });
                } else {
                    res.status(HTTPStatus.INTERNAL).json({ message: e });
                }
            }
        };
    }

    protected RegisterGetRoute(path, handler) {
        this.router.get(path, this.failable(handler));
    }

    protected RegisterPostRoute(path, handler, middleware?) {
        if (middleware) {
            this.router.post(path, middleware, this.failable(handler));
            return;
        }
        this.router.post(path, this.failable(handler));
    }
}
