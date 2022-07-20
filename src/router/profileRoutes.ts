import express from "express";
import { Request, Response } from "express";
import validateJWT from "../api/validateJWT";
import ProfileApi from "../api/profile-api";
import CustomError from "../CustomError";
import NewsLetter from "../database/models/Newsletter";

export default class ProfileRoutes {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.post("/profile/get-user", this.getUser);
        this.router.post("/profile/edit", validateJWT, this.editProfile);
        this.router.post("/profile/delete", validateJWT, this.deleteUser);
        this.router.post("/profile/follow", validateJWT, this.follow);
        this.router.post("/profile/following", validateJWT, this.following);
        this.router.post("/profile/followers", this.followers);
        this.router.post("/profile/liked", this.getLiked);
        this.router.post("/profile/contributing", this.getContributing);
        this.router.get("/profile/:uid/isFlashBsPrivate", this.privateStatus);
        this.router.post(
            "/profile/setFlashBsPrivate",
            validateJWT,
            this.setPrivate
        );
        this.router.post("/profile/mailingList", this.mailingList);
        this.router.post("/profile/setMerchantAgree", validateJWT, this.setMerchantAgree);
        this.router.post("/profile/isMerchantAgree", validateJWT, this.isMerchantAgree);
        this.router.get("/users", this.getAll);
        this.router.post("/profile/getUserAttributes", validateJWT, this.getUserAttributes);
    }

    private async deleteUser(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.deleteUser(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async getUser(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getUser(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async editProfile(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.editProfile(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async getAll(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getAll();
            res.status(response.status).json(response);
        } catch (e) {
            res.status(e.status || 500).json(e);
        }
    }

    private async follow(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.follow(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async following(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getFollowing(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async followers(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getFollowers(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async privateStatus(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.privateStatus({
                id: req.params.uid,
            });
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async setPrivate(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.setPrivate(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }
    private async mailingList(req: Request, res: Response) {
        try {
            const { email, ppAccept } = req.body;
            if (!email || !ppAccept) {
                throw new CustomError({
                    status: 400,
                    message: "All params are requred",
                });
            }

            const insert = await NewsLetter.create({
                email,
            });

            res.status(200).json({
                message: "Ok",
                id: insert.id,
            });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async getLiked(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getLiked(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async getContributing(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getContributing(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async setMerchantAgree(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.setMerchantAgree(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async isMerchantAgree(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.isMerchantAgree(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json(e);
        }
    }

    private async getUserAttributes(req: Request, res: Response) {
        try {
            const profile = new ProfileApi();
            const response = await profile.getUserAttributes(req.body);
            res.status(response.status).json(response);
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json(e);
        }
    }
}
