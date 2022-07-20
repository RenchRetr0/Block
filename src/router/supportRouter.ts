import express from "express";
import { Request, Response } from "express";
import { appAssert } from "../api/commom";
import { HTTPStatus } from "../utils";
import Mail from "../api/mail";

export default class SupportRouter {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes(): void {
        this.router.post("/support/message", this.sendMessage.bind(this));
    }

    private async sendMessage(req: Request, res: Response) {
        try {
            appAssert(
                req.is("json"),
                "Expecting Content-Type to be `application/json`",
                HTTPStatus.NOT_ACCEPTABLE
            );
            const { subject, name, email, text } = req.body;
            appAssert(
                subject && name && email && text,
                "All fields are required: 'subject', 'email', 'name', 'text'",
                HTTPStatus.BAD_REQUEST
            );
            const mail: Mail = new Mail();
            const sent = await mail.SupportMessageForOrganizers({
                subject,
                name,
                email,
                text,
            });
            res.status(sent.status).json({ message: sent.message });
        } catch (e) {
            console.log(e);
            res.status(e.status).json({ message: e.message });
        }
    }
}
