import { Request, Response } from "express";
import sequelize from "sequelize";
import Tag from "../database/models/Tag";
import User from "../database/models/User";
import Like from "../database/models/Likes";
import Ticket from "../database/models/Ticket";
import Circle from "../database/models/Circle";
import Profile from "../database/models/Profile";
import EventModel from "../database/models/Events";
import EventTags from "../database/models/EventTags";
import CircleContributors from "../database/models/CircleContributors";
import cEvent, { iTimezone } from "../database/models/Events";
import File from "../api/file";
import EventApi from "../api/event-api";
import validateJWT from "../api/validateJWT";
import { ValidateJWTResponse } from "../api/auth-api";
import { tryGetCircle, tryGetEvent, tryGetUser } from "../api/commom";
import { checkUserPermsForEvent, EPERM } from "../api/permissions";
import { ApplicationError } from "./ApplicationError";
import BaseRouter from "./BaseRouter";
import { HTTPStatus } from "../utils";
import EventContributors from "../database/models/EventContributors";
import { Op } from "sequelize";
import Interest from "../database/models/Interest";
import Paypal from "../database/models/Paypal";
import NftBalance from "../database/models/NftBalance";
import Gender from "../database/models/Gender";


const tryFn = <OkT, ErrT>(fn: () => OkT) => ({
    catch(catchFn: (err) => ErrT) {
        try {
            return fn();
        } catch (err) {
            if (typeof catchFn !== "function") {
                throw err;
            } else {
                return catchFn(err);
            }
        }
    },
});


export default class EventRouter extends BaseRouter {
    constructor() {
        super();
        this.initRoutes();
    }

    private initRoutes(): void {
        this.RegisterPostRoute("/event/contributor/delete", this.deleteContributor.bind(this), validateJWT);
        this.RegisterPostRoute("/event/updateowner", this.updateOwner.bind(this), validateJWT);
        this.RegisterPostRoute("/event/forCircle", this.getEventForCircle.bind(this));
        this.RegisterPostRoute("/event/near", this.getEventsNear.bind(this));

        this.RegisterPostRoute("/event/new", this.createEvent.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/edit", this.editEvent.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/delete", this.deleteEventById.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/addTicket", this.addTicket.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/editTags", this.editTags.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/like", this.likeEvent.bind(this), validateJWT);
        this.RegisterPostRoute("/event/:eventId/countLikes", this.getCountLikes.bind(this));
        this.RegisterPostRoute("/event/:eventId/stats", this.getEventStats.bind(this));

        this.RegisterPostRoute("/event/myEvents", this.getMyEvents.bind(this), validateJWT);
        this.RegisterPostRoute("/event/allowedToVerify", this.allowedToVerify.bind(this), validateJWT);

        this.RegisterPostRoute("/event/contributor/add", this.addContributor.bind(this), validateJWT);
        this.RegisterPostRoute("/event/contributor/get", this.getContributorsById.bind(this));
        this.RegisterPostRoute("/event/contributor/my", this.getContributedEvents.bind(this), validateJWT);
        this.RegisterPostRoute("/event/contributing", this.getContributing.bind(this), validateJWT);

        this.RegisterGetRoute("/event/addTest", this.addTestEvent.bind(this));
        this.RegisterGetRoute("/event/recent", this.getRecentlyAddedEvents.bind(this));
        this.RegisterGetRoute("/event/upcoming", this.getUpcomingEvents.bind(this));
        this.RegisterGetRoute("/event/:eventId", this.getEventById.bind(this));
        this.RegisterGetRoute("/event/:eventId/likes", this.getEventLikes.bind(this));


    }

    private async initModels() {
        // Should we do that?
        // Or maybe a better thing to do here is
        // global sync of all models?
        await Tag.prepare();
        await cEvent.prepare();
        await Ticket.prepare();
        await EventTags.prepare();
    }

    private async getEventById(req: Request, res: Response) {
        const sanitizeTags = (tags: Tag[]) => {
            return tags
                .map((e) => e.toJSON())
                .map((e) => {
                    const _ = { ...e };
                    Reflect.deleteProperty(e, "EventTags");
                    return e;
                });
        };

        await tryGetEvent(req.params.eventId, {
            include: [
                {
                    model: User,
                    include: [Profile,
                        {
                            model: Paypal,
                            attributes: {
                                exclude: ["access_token", "refresh_token"]
                            }
                        }
                    ],
                    attributes: {
                        exclude: ["password"],
                    },
                },
                {
                    model: Circle,
                    include: [
                        {
                            model: Paypal,
                            attributes: {
                                exclude: ["access_token", "refresh_token"]
                            }
                        }
                    ]
                },
            ],
        }).then(async (event) => {
            if (!event) {
                throw new ApplicationError(HTTPStatus.NOT_FOUND, "Event not found");
            }

            event.timezone = tryFn<iTimezone, string>(() =>
                JSON.parse(event.timezone as string)
            ).catch(() => event.timezone as string);
            const tags = await event.getTags().then(sanitizeTags);
            const tickets = await event.getTickets();
            res.json({ event, tags, tickets });
        });
    }

    private async deleteEventById(req: Request, res: Response) {
        const { token } = req.body;
        const eventId = req.params.eventId;

        const event: EventModel = await tryGetEvent(eventId, {
            include: [EventContributors]
        });

        await checkUserPermsForEvent(
            event,
            token.verify.user,
            EPERM.ADMIN
        );

        event.contributors.map(async contributor => await contributor.destroy())
        await event.destroy();

        res.json({
            status: HTTPStatus.SUCCESS,
            message: "Ok",
        });
    }

    //TODO: Get rid of this
    private parseDateTime(
        date: string,
        time: string,
        timezone: string | iTimezone
    ) {
        // If js cant understand supplied timezone getTime will return NaN
        // And we can implement timezone validation
        const validateTz = (tz: string | iTimezone) =>
            typeof tz === "string"
                ? new Date(`1 ${tz}`).getTime()
                : new Date(`1 ${tz.gmtOffset}`).getTime();

        if (!validateTz(timezone)) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Invalid event.timezone");
        }

        const [dd, mm, yyyy] = date.split(".");
        const zero = new Date(0);
        // Apparently js uses zero indexed months
        zero.setFullYear(+yyyy, +mm - 1, +dd);
        console.log(date, time, timezone);
        // Compensate for local timezone offset
        // And compensate for Daylight saving time for dates that are in the future
        const tzo = new Date(zero.getTime()).getTimezoneOffset() * 60_000;
        const baseTime = new Date(`01 Jan 1970 ${time}`);
        return new Date(zero.getTime() + baseTime.getTime() - tzo);
    }

    private async createEvent(req: Request, res: Response) {
        if (!req.is("json")) {
            throw new ApplicationError(HTTPStatus.NOT_ACCEPTABLE, "Expecting Content-Type to be `application/json`");
        }

        const { circleId, event, tags, token }: { circleId: number, event: any; tags: Array<string>, token: ValidateJWTResponse } = req.body;
        if (!event) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Missing `event` object");
        }

        if (event.shortLink) {
            const found = await EventModel.count({ where: { shortLink: event.shortLink } })
            if (found) {
                throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Event ID is not available");
            }
        }

        const user = await tryGetUser(token.verify.user.id);

        event.organizerId = user.id;

        if (circleId) {
            const circle = await tryGetCircle(circleId);
            event.COrganizerId = circle.id;
        }

        if (!user.merchantAgree) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Commercial agreement not accepted");
        }

        event.startTime = this.parseDateTime(
            event.startDate,
            event.startTime,
            event.timezone
        );
        event.endTime = this.parseDateTime(
            event.endDate,
            event.endTime,
            event.timezone
        );

        if (typeof event.timezone === "string") {
            console.warn("Using depecated method to save timezone");
        } else {
            event.timezone = JSON.stringify(event.timezone);
        }

        event.banner = (await this.uploadBanner(event)) || null;

        const newEvent = await cEvent.create({ ...event });

        if (tags && tags.length) {
            await Promise.all(
                tags.map(async (e) => {
                    await newEvent.addTagByName(e);
                })
            );
        }

        return res.json({ result: newEvent.id, message: "Ok" });
    }

    private async uploadBanner(obj: any) {
        if ("banner" in obj && obj.banner.length) {
            const bannerFile = new File();
            const savedFile = await bannerFile.uploadFile({
                file: obj.banner,
            });

            if (!savedFile || !savedFile.filePath) {
                throw new ApplicationError(HTTPStatus.INTERNAL, "Failed to save banner image as file");
            }
            return savedFile.filePath;
        }
        return null;
    }

    private async addTicket(req: Request, res: Response) {
        if (!req.is("json")) {
            throw new ApplicationError(HTTPStatus.NOT_ACCEPTABLE, "Expecting Content-Type to be `application/json`");
        }

        const event = await tryGetEvent(req.params.eventId);
        const { ticket } = req.body;

        if (!ticket) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "No ticket data provided");
        }

        ticket.banner =
            (await this.uploadBanner(ticket)) || "/images/placeholder.png";

        // if ('banner' in ticket && ticket.bonus.length) {
        //   const bonusFileSaver = new File('bonus');
        //   const uploaded = await bonusFileSaver.uploadFile({
        //     file: ticket.bonus
        //   });

        //   if(!uploaded || !uploaded.filePath) {
        //     throw new ApplicationError(HTTPStatus.INTERNAL, "Failed to save bonus as file")
        //   }
        //   ticket.bonus = uploaded.filePath;
        // }

        await event.createTicket({ ...ticket });

        return res.json({ message: "Ok" });
    }

    private async editEvent(req: Request, res: Response) {
        if (!req.is("json")) {
            throw new ApplicationError(HTTPStatus.NOT_ACCEPTABLE, "Expecting Content-Type to be `application/json`");
        }

        const event = await tryGetEvent(req.params.eventId);
        const { update } = req.body;

        if (!update) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "No update data provided");
        }

        if (update.shortLink) {
            const found = await EventModel.findOne({ where: { shortLink: update.shortLink } });

            if (found && (found.COrganizerId != event.COrganizerId || found.organizerId != event.organizerId)) {
                throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Event ID is not available");
            }
        }

        const prevTz = tryFn<iTimezone, string>(() =>
            JSON.parse(event.timezone as string)
        ).catch(() => event.timezone as string);
        if (update.startTime) {
            update.startTime = this.parseDateTime(
                update.startDate,
                update.startTime,
                update.timezone || prevTz
            );
        }

        if (update.endTime) {
            update.endTime = this.parseDateTime(
                update.endDate,
                update.endTime,
                update.timezone || prevTz
            );
        }

        if (typeof update.timezone === "string") {
            console.warn("Using depecated method to save timezone");
        } else {
            update.timezone = JSON.stringify(update.timezone);
        }

        const uploaded = await this.uploadBanner(update);
        if (uploaded) {
            update.banner = uploaded;
        }

        // Stupid fix frontend banner state
        if (!update.banner) {
            update.banner = undefined;
        }

        update.timezone = update.timezone || event.timezone;

        await event.update({
            ...update,
        });
        return res.json({ result: "Ok" });
    }

    private async editTags(req: Request, res: Response) {
        if (!req.is("json")) {
            throw new ApplicationError(
                HTTPStatus.NOT_ACCEPTABLE,
                "Expecting Content-Type to be `application/json`"
            );
        }

        const event = await tryGetEvent(req.params.eventId);
        const { tags } = req.body;
        if (!tags) {
            throw new ApplicationError(
                HTTPStatus.BAD_REQUEST,
                "Tags object was not provided in the request"
            );
        }

        const { add, del } = tags;

        if (del && Array.isArray(del)) {
            await Promise.all(del.map((e) => event.removeTagByName(e)));
        }

        if (add && Array.isArray(add)) {
            await Promise.all(add.map((e) => event.addTagByName(e)));
        }

        return res.json({ removed: del?.length || 0, added: add?.length || 0 });
    }

    private async getEventLikes(req: Request, res: Response) {
        const event = await tryGetEvent(req.params.eventId);
        return event.getLikes().then((likes) => {
            res.json({ likedBy: likes.map((e) => e.userId) });
        });
    }

    private async likeEvent(req: Request, res: Response) {
        if (!req.is("json")) {
            throw new ApplicationError(HTTPStatus.NOT_ACCEPTABLE, "Expecting Content-Type to be `application/json`");
        }

        const event = await tryGetEvent(req.params.eventId);
        const { token, readonly } = req.body;

        const likeStatus = await Like.findOne({
            where: {
                userId: token.verify.user.id,
                eventId: event.id,
            },
        });

        if (readonly) {
            const countLikes = await Like.count({
                where: {
                    eventId: event.id,
                },
            });

            return res.json({
                liked: !!likeStatus,
                countLikes
            });
        }

        if (likeStatus) {
            await likeStatus.destroy();
            var liked = false;
        } else {
            await event.createLike({
                userId: token.verify.user.id,
            });
            var liked = true;
        }

        const countLikes = await Like.count({
            where: {
                eventId: event.id,
            },
        });

        res.json({ liked, countLikes });
    }

    private async getCountLikes(req: Request, res: Response) {
        const eventId = Number(req.params.eventId);
        if (Number.isNaN(eventId)) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Event id should be int");
        }

        const countLikes = await Like.count({
            where: {
                eventId: eventId
            }
        })

        res.json({ countLikes });
    }

    private async getEventForCircle(req: Request, res: Response) {
        throw new ApplicationError(HTTPStatus.INTERNAL, "This method is deprecated, use /circle/events");

        if (!req.is("json")) {
            throw new ApplicationError(
                HTTPStatus.NOT_ACCEPTABLE,
                "Expecting Content-Type to be `application/json`"
            );
        }

        const { circleId } = req.body;
        if (!circleId) {
            throw new ApplicationError(
                HTTPStatus.BAD_REQUEST,
                "No circleId was provided in the request"
            );
        }

        const circle = await EventModel.findOne({
            where: {
                COrganizerId: circleId,
            },
        });

        if (!circle) {
            throw new ApplicationError(HTTPStatus.NOT_FOUND, "Requested Circle not found");
        }
        return res.json({ events: circle.organizer.events });
    }

    private async getEventsNear(req: Request, res: Response) {
        const { city, location_lat, location_lon } = req.body;
        let events: EventModel[];
        const radius = 1; // radius in which the event is searched

        events = await EventModel.findAll({
            where: {
                [sequelize.Op.or]: {
                    location_address: {
                        [sequelize.Op.iLike]: `%${city}%`
                    },
                    [sequelize.Op.and]: {
                        location_lat: {
                            [sequelize.Op.between]: [location_lat - radius, location_lat + radius]
                        },
                        location_lon: {
                            [sequelize.Op.between]: [location_lon - radius, location_lon + radius]
                        }
                    }
                },
                eventTypeIsPrivate: false
            },
        });

        res.json({ events });
    }

    private async getMyEvents(req: Request, res: Response) {
        const circles: Circle[] = await Circle.findAll({
            where: {
                organizerId: req.body.token.verify.user.id
            }
        });
        const events = await EventModel.findAll({
            where: {
                [Op.or]: {
                    organizerId: req.body.token.verify.user.id,
                    COrganizerId: {
                        [Op.in]: (circles.map(x => x.id) || null)
                    }
                }
            },
            paranoid: true
        });

        if (!events || !events.length) {
            throw new ApplicationError(HTTPStatus.NOT_FOUND, "No events found for sepcified user");
        }

        return res.json({ events });
    }

    private async getRecentlyAddedEvents(req: Request, res: Response) {
        const events = await EventModel.findAll({
            limit: 25,
            order: sequelize.literal(`"createdAt" DESC`),
            where: {
                eventTypeIsPrivate: false,
            },
        });
        return res.json({ events });
    }

    private async getUpcomingEvents(req: Request, res: Response) {
        const events = await EventModel.findAll({
            where: {
                startTime: {
                    [sequelize.Op.gt]: new Date(),
                },
                eventTypeIsPrivate: false,
            },
            limit: 25,
            order: [["startTime", "ASC"]],
        });
        return res.json({ events });
    }

    private async allowedToVerify(req: Request, res: Response) {
        const {
            eventId,
            token,
        }: { eventId: number; token: ValidateJWTResponse } = req.body;

        if (!eventId) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "`eventId` not supplied");
        }

        if (!token) {
            throw new ApplicationError(HTTPStatus.INTERNAL, "Internal server error, could not get jwt token");
        }

        const event = await tryGetEvent(eventId);

        if (event.organizerId == token.verify.user.id) {
            return res.status(HTTPStatus.SUCCESS).json({
                message: "Ok",
            });
        }

        const cirlce = await event.getCircle();
        const contrib = await CircleContributors.findOne({
            where: {
                userId: token.verify.user.id,
                cirlceId: cirlce.id,
            },
        });

        if (!contrib || cirlce.organizerId !== token.verify.user.id) {
            throw new ApplicationError(HTTPStatus.FROBIDDEN, "You are not allowed to do that");
        }

        return res.status(HTTPStatus.SUCCESS).json({
            message: "Ok",
        });
    }

    private async addTestEvent(req: Request, res: Response) {
        const TIME_ZONE = "GMT+3";
        const newEvent = await cEvent.create({
            name: "Event 2.0",
            description: "Discription 2.0",
            shortLink: "testShortLink",
            banner: "base64",
            startTime: new Date(`02.10.2021 11:00 am ${TIME_ZONE}`),
            endTime: new Date(`02.10.2021 05:00 pm ${TIME_ZONE}`),
            timezone: TIME_ZONE,
            securityLevel: false,
            eventTypeIsPrivate: false,
            location: "Улица 1",
            location_lat: 1,
            location_lon: 1,
            location_address: "дом 1",
            online_link: null,
            organizerId: null,
            COrganizerId: 24,
            likesIsPrivate: false
        });

        await newEvent.addTagByName("asdfasddf");

        await newEvent.createTicket({
            name: "regular",
            description: "asdfasdf",
            price: 100,
            currency: "USD",
            banner: "asdf",
            bonus: "",
            features: "",
            copies: 100,
            royalty: 0,
            TicketAssetId: "some",
        });
        res.json({ result: newEvent.id });
    }

    private async addContributor(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.addContributor(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async getContributorsById(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.getContributors(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async deleteContributor(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.deleteContributor(req.body);
            res.status(response.status).json(response.message);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async updateOwner(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.changeEventOwner(req.body);
            res.status(response.status).json(response.message);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async getContributedEvents(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.getContributedEvents(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async getContributing(req: Request, res: Response) {
        try {
            const eventApi = new EventApi();
            let response = await eventApi.getContributing(req.body);
            res.status(response.status).json(response);
        } catch (error) {
            console.error(error);
            res.status(error.status || HTTPStatus.INTERNAL).json({ message: error.message });
        }
    }

    private async getEventStats(req: Request, res: Response): Promise<void> {
        const event: EventModel = await tryGetEvent(req.params.eventId);

        const tickets = await event.getTickets();
        const ticketIds = tickets.map(x => x.id);

        const genderPromise = NftBalance.findAll({
            where: {
                [sequelize.Op.and]: {
                    tokenId: {
                        [sequelize.Op.in]: ticketIds
                    },
                    verified: true
                }
            },
            include: {
                model: User,
                include: [{
                    model: Profile,
                    include: [{
                        model: Gender,
                        attributes: ["gender"],
                    }],
                }]
            }
        }).then(users => {
            let totalMen = 0;
            let totalWomen = 0;
            let totalAnother = 0;

            users.forEach(user => {
                if (user.verifyOwner.profile.gender) {
                    if (user.verifyOwner.profile.gender.gender == "Male")
                        ++totalMen;
                    else if (user.verifyOwner.profile.gender.gender == "Female")
                        ++totalWomen;
                    else
                        ++totalAnother;
                } else {
                    ++totalAnother;
                }
            });

            return { totalMen, totalWomen, totalAnother };
        });


        const averageTimePromise = NftBalance.findAll({
            where: {
                [sequelize.Op.and]: {
                    tokenId: {
                        [sequelize.Op.in]: ticketIds
                    },
                    verified: true
                }
            }
        }).then(users => {
            let sumTimeIn = 0;
            let sumTimeOut = 0;
            let totalReVerified = 0;

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                sumTimeIn += user.verifiedAt.setFullYear(1970, 0, 1);

                if (user.reVerified) {
                    sumTimeOut += user.reVerifiedAt.setFullYear(1970, 0, 1);
                    ++totalReVerified;
                }
            }

            return {
                averageTimeIn: new Date(sumTimeIn / users.length),
                averageTimeOut: new Date(sumTimeOut / totalReVerified)
            }
        });

        const totalTicketCopiesPromise = Ticket.sum("copies", {
            where: { EventModelId: event.id }
        });

        const totalSoldPromise = Ticket.sum("minted", {
            where: { EventModelId: event.id }
        });

        const totalAttendeesPromise = NftBalance.count({
            where: {
                [sequelize.Op.and]: {
                    tokenId: {
                        [sequelize.Op.in]: ticketIds
                    },
                    verified: true
                }
            }
        });

        const [gender, averageTime, totalTicketCopies, totalSold, totalAttendees] = await Promise.all([
            genderPromise,
            averageTimePromise,
            totalTicketCopiesPromise,
            totalSoldPromise,
            totalAttendeesPromise
        ]);

        res.json({
            totalTicketCopies,
            totalSold,
            totalAttendees,
            averageTime,
            gender,
        });
    }
}
