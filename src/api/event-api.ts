import CustomError from "../CustomError";
import EventContributors from "../database/models/EventContributors";
import EventPermissions from "../database/models/EventPermissions";
import EventModel from "../database/models/Events";
import Profile from "../database/models/Profile";
import Circle from "../database/models/Circle";
import User from "../database/models/User";

import crypto from "crypto";
import Mail from "./mail";
import { ApplicationError } from "../router/ApplicationError";
import { checkUserPermsForEvent, EPERM } from "./permissions";
import { appAssert, tryGetCircle, tryGetUser } from "./commom";
import AuthApi, { ValidateJWTResponse } from "./auth-api";
import { HTTPStatus } from "../utils";

// TODO: move is out of here
const randInt = (start, end) =>
    Math.floor(start + Math.random() * (end - start));
export const XOR = (a: any, b: any) => Number(Boolean(a)) ^ Number(Boolean(b));
// Workaroun, that `finaly` always getting called
type callbackT = (...args: any) => any;
export function lazyFinaly<T extends callbackT>(
    a: T,
    b: T,
    c: T
): ReturnType<T> {
    try {
        return a();
    } catch (e) {
        try {
            return b();
        } catch (ee) {
            return c();
        }
    }
}

export default class EventApi {
    async userByIdOrEmail(
        userId: string | number | undefined,
        email: string | undefined
    ) {
        // Only userId or email can be supplied, not both at the same time, XOR is exactly that
        appAssert(
            XOR(userId, email),
            "UserId and Email cannot be supplied at the same time",
            HTTPStatus.BAD_REQUEST
        );

        if (userId) {
            return await tryGetUser(userId);
        } else {
            appAssert(
                email,
                "userId is not provided, email required",
                HTTPStatus.BAD_REQUEST
            );
            const user = await User.findOne({
                where: {
                    email: email.toLowerCase(),
                },
            });
            appAssert(
                user,
                `User with email ${email} not found`,
                HTTPStatus.NOT_FOUND
            );
            return user;
        }
    }

    async createNewUser(email: string, inviter: User, event: EventModel) {
        // TODO: Now this is using auth api sign up method.
        // Should refactor other places where we need to create new user account

        appAssert(
            email,
            "Can not create user without email",
            HTTPStatus.BAD_REQUEST
        );
        appAssert(event, "No event supplied, Unreachable");
        appAssert(inviter, "No inviter supplied, Unreachable");

        const mail = new Mail();
        const randomPassword =
            crypto.randomBytes(10).toString("hex") + "#" + randInt(1000, 9999);

        await AuthApi.signUp({
            fullName: "Name Surname",
            email: email.toLowerCase(),
            password: randomPassword,
            newsLetter: false,
            ppAccept: true,
        });

        const user = await User.findOne({
            where: { email: email.toLowerCase() },
        });
        appAssert(user, "Failed to get created user");

        await mail.sendEventContributorMessageToUnregistredUser({
            event: event,
            credentials: {
                login: email.toLowerCase(),
                password: randomPassword,
            },
            newUserId: user.id,
            inviter,
        });

        return user;
    }

    async createUserIfNotFound(
        userId: string | number | undefined,
        email: string | undefined,
        inviter: User,
        event: EventModel
    ) {
        try {
            const user = await this.userByIdOrEmail(userId, email);
            return { isNew: false, user };
        } catch (e) {
            // Swallow not found exceptions
            if (
                !(e instanceof CustomError) ||
                e.status !== HTTPStatus.NOT_FOUND
            ) {
                throw e;
            }
            const created = await this.createNewUser(email, inviter, event);
            return { isNew: true, user: created };
        }
    }

    async addContributor(options: {
        token: ValidateJWTResponse;
        eventId: number;
        userId: number | string;
        permissions: string;
        email: string;
    }) {
        const { token, eventId, userId, permissions, email } = options;

        appAssert(eventId, "`eventId` is reqired", HTTPStatus.BAD_REQUEST);
        try {
            appAssert(userId, "`userId` is reqired");
        } catch (e) {
            appAssert(
                email,
                "`email` is reqired is no userId provided",
                HTTPStatus.BAD_REQUEST
            );
        }
        appAssert(
            permissions,
            "`permissions` is reqired",
            HTTPStatus.BAD_REQUEST
        );
        appAssert(
            typeof permissions === "string",
            "Invalid data type for permission",
            HTTPStatus.BAD_REQUEST
        );

        const permission = await EventPermissions.findOne({
            where: {
                permission: permissions,
            },
        });

        appAssert(permission, "Invalid permissions", 404);

        const event: EventModel = await this.getEvent(eventId);
        const { isNew, user } = await this.createUserIfNotFound(
            userId,
            email,
            token.verify.user,
            event
        );

        appAssert(
            token.verify.user.id !== user.id,
            "You can not add yourself as a contributor",
            HTTPStatus.BAD_REQUEST
        );
        appAssert(
            event.organizerId !== user.id,
            "This user is event owner",
            HTTPStatus.BAD_REQUEST
        );

        await checkUserPermsForEvent(event, token.verify.user, EPERM.ADMIN);

        const existing = await EventContributors.findOne({
            where: {
                userId: user.id,
                eventId: event.id,
            },
            include: [EventPermissions],
        });

        if (existing) {
            appAssert(
                existing.event_permissionId !== permission.id,
                "Existing permisson is identical to New permission",
                HTTPStatus.BAD_REQUEST
            );

            const updated = await existing.update({
                event_permissionId: permission.id,
            });

            return {
                status: 200,
                message: "Ok",
                contributor: await updated.reload(),
            };
        }

        const contributor = await EventContributors.create({
            userId: user.id,
            event_permissionId: permission.id,
            eventId: event.id,
        });

        if (!isNew) {
            const mail = new Mail();
            await mail.sendEventContributorMessageToRegistredUser({
                event: event,
                sender_userId: token.verify.user.id,
                contributorId: user.id,
                owner: false,
            });
        }

        return {
            status: 200,
            message: "Ok",
            contributor: contributor,
        };
    }

    async getContributors(options: { eventId: number }): Promise<{
        status: number;
        message: string;
        contributors: Array<object>;
    }> {
        const { eventId } = options;

        appAssert(eventId, "`eventId` is required", HTTPStatus.BAD_REQUEST);

        const event = await this.getEvent(eventId);

        let contributors = await EventContributors.findAll({
            where: {
                eventId: event.id,
            },
            include: [
                {
                    model: User,
                    include: [Profile],
                    attributes: {
                        exclude: ["password"],
                    },
                },
                EventPermissions,
            ],
        });

        const owner = await this.getOwner(event.organizerId, event.COrganizerId);

        return {
            status: 200,
            message: "Ok",
            contributors: [
                // owner, 
                ...contributors
            ]
        };
    }

    async getOwner(organizerId?: number, COrganizerId?: number) {
        console.log(organizerId, COrganizerId)
        return (!!organizerId) ? await User.findOne({
            where: {
                id: Number(organizerId)
            },
            include: [Profile],
            attributes: {
                exclude: ["password"]
            }
        }) : await Circle.findOne({
            where: {
                id: Number(COrganizerId)
            }
        });
    }

    async deleteContributor(options: {
        token: ValidateJWTResponse;
        eventId: number;
        contributorId: number;
    }): Promise<any> {
        const { token, eventId, contributorId } = options;

        appAssert(eventId, "`eventId` is required", HTTPStatus.BAD_REQUEST);
        appAssert(
            contributorId,
            "`contributorId` is required",
            HTTPStatus.BAD_REQUEST
        );

        const user = token.verify.user;

        const event = await this.getEvent(eventId);

        const contributor = await EventContributors.findOne({
            where: {
                userId: contributorId,
                eventId: event.id,
            },
            include: [User],
        });

        const requestedContributor = await EventContributors.findOne({
            where: {
                userId: Number(token.verify.user.id),
                eventId: event.id,
            },
            include: [User],
        });

        appAssert(contributor, "Contributor not found", HTTPStatus.NOT_FOUND);
        appAssert(contributorId !== (event.organizerId || event.COrganizerId), 'You cannot delete event owner', HTTPStatus.FROBIDDEN);

        if (token.verify.user.id != contributor.userId) {
            await checkUserPermsForEvent(event, user, EPERM.ADMIN);

            if (token.verify.user.id != event.organizerId) {
                appAssert(
                    requestedContributor.event_permissionId !=
                        contributor.event_permissionId,
                    "You can't delete contributor with same permissions",
                    HTTPStatus.FROBIDDEN
                );
            }
        }

        // User model uses BIGINT as key but EventContirbutors uses INTEGER as a string
        // According to https://stackoverflow.com/a/33425947 this is expected behaviour
        // This is why here we using just eqeq op instad of strict equals
        // TODO: Fix this in other places
        // appAssert(token.verify.user.id == event.organizerId, 'You cannot delete yourself', HTTPStatus.FROBIDDEN);

        await contributor.destroy();

        return {
            status: 200,
            message: "Ok",
        };
    }

    async changeEventOwner(options: {
        eventId: number;
        userId: number | string;
        email: string;
        circleId: number | string;
        token: any;
    }): Promise<{ status: number; message: string; event: any }> {
        const { eventId, circleId, userId, token, email } = options;

        appAssert(eventId, "`eventId` is required", HTTPStatus.BAD_REQUEST);
        // Comment here about how cool that you can do that
        lazyFinaly(
            () =>
                appAssert(
                    userId,
                    "`userId` is required",
                    HTTPStatus.BAD_REQUEST
                ),
            () =>
                appAssert(
                    email,
                    "`email` is required if `userId` not provided ",
                    HTTPStatus.BAD_REQUEST
                ),
            () =>
                appAssert(
                    circleId,
                    "`circleId` is required if no `userId` nor `email` provided",
                    HTTPStatus.BAD_REQUEST
                )
        );

        appAssert(
            XOR(email, XOR(userId, circleId)),
            `Only one new owner identifier can be present`,
            HTTPStatus.BAD_REQUEST
        );

        const event = await this.getEvent(eventId);

        // await checkUserPermsForEvent(event, token.verify.user, EPERM.OWNER)
        appAssert(
            token.verify.user.id == event.organizerId,
            "Only owner can do this operation",
            HTTPStatus.FROBIDDEN
        );

        if (circleId) {
            const circle = await tryGetCircle(circleId);

            const updated = await event.update({
                COrganizerId: circle.id,
                organizerId: null,
            });

            return {
                status: 200,
                message: "OK",
                event: updated,
            };
        }

        if (userId || email) {
            const previousOwnerId = event.organizerId || event.COrganizerId;

            const user = await this.userByIdOrEmail(userId, email);

            const mail = new Mail();

            if (previousOwnerId === user.id) {
                throw new ApplicationError(
                    HTTPStatus.BAD_REQUEST,
                    "You cannot add yourself as an owner."
                );
            }

            const updated = await event.update({
                organizerId: user.id,
                COrganizerId: null,
            });

            const existingEventContributor = await EventContributors.findOne({
                where: {
                    userId: user.id,
                    eventId: event.id,
                },
                include: [EventPermissions],
            });

            if (existingEventContributor) {
                await existingEventContributor.destroy();
            }

            await EventContributors.create({
                userId: previousOwnerId,
                eventId: event.id,
                event_permissionId: EPERM.ADMIN,
            });

            // Should we send an email on owner chamge?
            // Maybe...
            // but not to pervious owner telling him that he became a contiributor

            await mail.sendEventContributorMessageToRegistredUser({
                event,
                sender_userId: previousOwnerId,
                contributorId: user.id,
                owner: true,
            });

            return {
                status: 200,
                message: "OK",
                event: updated,
            };
        }
        appAssert(false, "UNREACHABLE CODE");
    }

    async getEvent(id: any): Promise<EventModel> {
        const eventId = Number(id);

        if (isNaN(eventId) || eventId <= 0) {
            throw new ApplicationError(HTTPStatus.BAD_REQUEST, "Invalid eventID");
        }
        const event = await EventModel.findByPk(eventId, {
            include: [Circle, EventContributors],
        });

        if (!event) {
            throw new ApplicationError(404, "Requested event not found");
        }

        return event;
    }

    async getContributedEvents(options: {
        token: ValidateJWTResponse;
    }): Promise<any> {
        const { token } = options;

        const events = await EventContributors.findAll({
            where: {
                userId: token.verify.user.id,
            },
            include: [EventModel],
        });

        return {
            status: 200,
            message: "ok",
            events: events,
        };
    }

    public async getContributing({
        userId,
    }: {
        userId: string | number;
    }): Promise<any> {
        const user = await tryGetUser(userId);
        const contributing = await EventContributors.findAll({
            where: {
                userId: user.id,
            },
            include: [EventModel, EventPermissions],
        });

        return {
            status: 200,
            message: "Ok",
            contributing: contributing
                .map((e) =>
                    e.event
                        ? { event: e.event, role: e.event_permissions }
                        : null
                )
                .filter((x) => x !== null),
        };
    }
}
