import express from "express";
import { Request, Response } from "express";

import sequelize from "sequelize";
import Circle from "../database/models/Circle";
import EventModel from "../database/models/Events";
import Interest from "../database/models/Interest";
import Profile from "../database/models/Profile";
import User from "../database/models/User";
import Tag from "../database/models/Tag";

import BaseRouter from "./BaseRouter";
import { ApplicationError } from "./ApplicationError";
import { HTTPStatus } from "../utils";


export default class SearchRouter extends BaseRouter {
    router = express.Router();

    constructor() {
        super();
        this.initRoutes();
    }

    private initRoutes(): void {
        this.RegisterPostRoute("/search", this.search.bind(this));
        this.RegisterPostRoute("/search/tag", this.searchByTag.bind(this));
        this.RegisterPostRoute("/search/events", this.searchEvents.bind(this));
        this.RegisterPostRoute("/search/circles", this.searchCircles.bind(this));
        this.RegisterPostRoute("/search/users", this.searchUsers.bind(this));
    }

    private async search(req: Request, res: Response): Promise<void> {
        const { searchTerm } = req.body;

        if (!searchTerm) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Bad request, `searchTerm` is required");
        }

        res.json({
            Events: await this.getEvents(searchTerm),
            Circles: await this.getCircles(searchTerm),
            Users: await this.getUsers(searchTerm)
        });
    }

    private async searchByTag(req: Request, res: Response): Promise<void> {
        const { searchTerm } = req.body;

        if (!searchTerm) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Bad request, `searchTerm` is required");
        }

        const eventTags = await Tag.findAll({
            limit: 3,
            where: {
                name: { [sequelize.Op.iLike]: `%${searchTerm}%` },
            },
            include: [
                {
                    model: EventModel,
                    include: [Circle],
                },
            ],
            order: [
                ["name", "ASC"]
            ]
        });

        const userTag = await Interest.findAll({
            limit: 20,
            where: {
                interest: { [sequelize.Op.iLike]: `%${searchTerm}%` },
            },
            include: [{
                model: Profile,
                include: [{
                    model: User,
                    attributes: {
                        exclude: ["password"],
                    },
                }],
            }],
            order: [
                ["interest", "ASC"]
            ],
        });

        // group tag by names
        let groupUserTags = userTag.reduce((r, a) => {
            r[a.interest] = [...r[a.interest] || [], a];
            return r;
        }, {});

        // get first three element
        let userTags = []
        for (const [key, value] of Object.entries(groupUserTags).slice(0, 3)) {
            userTags.push(value)
        }

        res.json({ eventTags, userTags });
    }

    private async searchEvents(req: Request, res: Response): Promise<void> {
        const { searchTerm } = req.body;

        if (!searchTerm) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Bad request, `searchTerm` is required");
        }

        res.json({ events: await this.getEvents(searchTerm) })
    }

    private async searchCircles(req: Request, res: Response): Promise<void> {
        const { searchTerm } = req.body;

        if (!searchTerm) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Bad request, `searchTerm` is required");
        }

        res.json({ circles: await this.getCircles(searchTerm) })
    }

    private async searchUsers(req: Request, res: Response): Promise<void> {
        const { searchTerm } = req.body;

        if (!searchTerm) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Bad request, `searchTerm` is required");
        }

        res.json({ users: await this.getUsers(searchTerm) })
    }

    private async getEvents(searchTerm: string): Promise<EventModel[]> {

        let whereCondition: object[] = [
            { name: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
            { shortLink: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        ];

        const searchTermId: number = parseInt(searchTerm);
        if (searchTermId) {
            whereCondition.push({ id: searchTermId });
        }

        const found = await EventModel.findAll({
            where: {
                [sequelize.Op.or]: whereCondition,
                eventTypeIsPrivate: false
            },
            order: [
                ["short_link", "ASC"],
                ["name", "ASC"],
            ]
        });

        return found
    }

    private async getCircles(searchTerm: string): Promise<Circle[]> {
        let whereCondition: object[] = [
            { circleName: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
            { contactEmail: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
            { shortLink: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        ];

        const searchTermId: number = parseInt(searchTerm);
        if (searchTermId) {
            whereCondition.push({ id: searchTermId });
        }

        const found = await Circle.findAll({
            where: {
                [sequelize.Op.or]: whereCondition,
            },
            order: [
                ["short_link", "ASC"],
                ["circle_name", "ASC"],
                ["contact_email", "ASC"],
            ]
        });

        return found;
    }

    private async getUsers(searchTerm: string): Promise<User[]> {
        // в переменную "whereCondition" закладываем строку, которая пришла в POST запросе,
        // в следующие параметры: "fullName", "email", "shortLink"
        let whereCondition: object[] = [
            { fullName: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
            { email: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
            { shortLink: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        ];
        // в массив "searchTermId" закладываем какойто id
        const searchTermId: number = parseInt(searchTerm);
        // Если не пустая, то что...
        if (searchTermId) {
            whereCondition.push({ id: searchTermId });
        }
        // в массиве "found" закладываем всё
        const found = await User.findAll({
            // с чем нашли сходство
            where: {
                [sequelize.Op.or]: whereCondition,
            },
            // из какой модели берём записи
            include: [
                {
                    model: Profile,
                    include: [Interest],
                },
            ],
            // что выводить не надо
            attributes: {
                exclude: ["password"],
            },
            // что должно быть в массиве "found"
            order: [
                ["short_link", "ASC"],
                ["full_name", "ASC"],
                ["email", "ASC"],
            ]
        });

        return found
    }
}
