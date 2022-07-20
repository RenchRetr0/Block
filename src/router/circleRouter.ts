import express from "express";
import { Request, Response } from "express";
import validateJWT from "../api/validateJWT";
import CircleApi from "../api/circle-api";
import EventModel from "../database/models/Events";
import CustomError from "../CustomError";
import Circle from "../database/models/Circle";
import sequelize from "sequelize";
import { tryGetCircle } from "../api/commom";

export default class CircleRouter {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.post("/circle/create", validateJWT, this.createCircle);
        this.router.post("/circle/get", this.getCircle);
        this.router.post("/circle/update", validateJWT, this.updateCircle);
        this.router.post("/circle/delete", validateJWT, this.deleteCircle);
        this.router.post(
            "/circle/contributor/add",
            validateJWT,
            this.addContributor
        );
        this.router.post("/circle/contributor", this.getContributor);
        this.router.post("/circle/user", this.getUserCircles);
        this.router.post("/circle/stats", this.getCircleStats);
        this.router.post("/circle/followers", this.getFollowers);
        this.router.post("/circle/updateowner", validateJWT, this.updateOwner);
        this.router.get("/circle/events/:id", this.getCircleEvents.bind(this));
        this.router.get("/circle/all", this.getAllCircles.bind(this));
        this.router.post(
            "/circle/contributor/delete",
            validateJWT,
            this.deleteContributor
        );
    }

    private async getContributor(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.getContributors(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async addContributor(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.addContributor(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async getUserCircles(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.getUserCircles(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async createCircle(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.createCircle(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async deleteCircle(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.deleteCircle(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async getCircle(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.getCircle(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async updateCircle(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            let id = req.body.id;
            delete req.body.id;
            const response = await circle.updateCircle(
                { id },
                { ...req.body.data, token: req.body.token }
            );
            res.status(response.status).json(response);
        } catch (error) {
            if (error?.parent?.code == "23505") {
                res.status(400).json({
                    status: 400,
                    message: "shortLink isn't unique!",
                });
                return;
            }
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async getFollowers(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.getFollowers(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async updateOwner(req: Request, res: Response) {
        try {
            const circle = new CircleApi();
            const response = await circle.changeCircleOwner(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async getCircleEvents(req: Request, res: Response) {
        try {
            let circleId: number | string = req.params.id;

            const circle = await tryGetCircle(circleId, { paranoid: true })

            const circleEvents = await EventModel.findAll({
                where: {
                    COrganizerId: circle.id,
                },
            });

            if (!circleEvents) {
                throw new CustomError({
                    status: 404,
                    message: "Events not found",
                });
            }

            res.status(200).json({ message: "OK", events: circleEvents });
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }
    private async getAllCircles(req: Request, res: Response) {
        try {
            const cricles = await Circle.findAll();
            res.status(200).json({ cricles });
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async deleteContributor(req: Request, res: Response) {
        try {
            const capi = new CircleApi();
            const r = await capi.deleteContributor(req.body);
            res.status(200).json(r);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }

    private async getCircleStats(req: Request, res: Response) {
        try {
            const capi = new CircleApi();
            const r = await capi.getCircleStats(req.body);
            res.status(200).json(r);
        } catch (error) {
            console.log(error);
            res.status(error.status || 500).json(
                JSON.stringify(error).length == 2
                    ? { message: error.message }
                    : error
            );
        }
    }
}
