import Circle from "../database/models/Circle";
import { CircleEventType } from "../database/models/CircleEventType";
import CustomError from "../CustomError";
import User from "../database/models/User";
import is from "is_js";
import File from "./file";
import CircleEventInterval from "../database/models/CircleEventInterval";
import CirclePermissions from "../database/models/CirclePermissions";
import CircleContributors from "../database/models/CircleContributors";
import AvalancheApi from "../avalanche/avalanche-api";
import { Buffer } from "avalanche";
import Wallet from "../database/models/Wallet";
import EventModel from "../database/models/Events";
import { ValidateJWTResponse } from "./auth-api";
import Profile from "../database/models/Profile";
import { appAssert, tryGetCircle, tryGetUser } from "./commom";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { col, Op } from "sequelize";
import Mail from "./mail";
import { checkUserPermsForCircle, EPERM } from "./permissions";
import { HTTPStatus } from "../utils";
import Ticket from "../database/models/Ticket";
import Paypal from "../database/models/Paypal";
import Interest from "../database/models/Interest";
import Gender from "../database/models/Gender";
import NftBalance from "../database/models/NftBalance";

export default class CircleApi {
    async createCircle(options: {
        circleName: string;
        country: string;
        city: string;
        eventType: string;
        createrId: number | string;
        contactPerson: string;
        contactEmail: string;
        eventInterval: string;
        logo?: string;
        banner?: string;
        bio?: string;
        instagram?: string | undefined;
        twitter?: string | undefined;
        website?: string | undefined;
    }): Promise<{ status: number; message: string; circle: Circle }> {
        try {
            const {
                circleName,
                country,
                city,
                contactPerson,
                contactEmail,
                bio,
                eventType,
                eventInterval,
                createrId,
                logo,
                banner,
                instagram,
                twitter,
                website,
            } = options;
            const avalanche = new AvalancheApi();

            if (
                !(
                    circleName &&
                    country &&
                    city &&
                    contactPerson &&
                    contactEmail &&
                    createrId
                )
            ) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Not enough data",
                });
            }

            if (
                typeof contactEmail !== "undefined" &&
                !is.email(contactEmail)
            ) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Invalid email address",
                });
            }

            let eventTypeId = null;

            if (eventType) {
                eventTypeId = (
                    await CircleEventType.findOne({
                        where: {
                            name: eventType,
                        },
                    })
                ).id;
            }

            const user = await tryGetUser(createrId);

            let file = new File();
            let logoPath;
            let bannerPath;

            if (logo) {
                logoPath = (await file.uploadFile({ file: logo })).filePath;
            }

            if (banner) {
                bannerPath = (await file.uploadFile({ file: banner })).filePath;
            }

            let event_interval_id = null;

            if (eventInterval) {
                event_interval_id = (
                    await CircleEventInterval.findOne({
                        where: {
                            name: eventInterval,
                        },
                    })
                )?.id;
            }

            let circle = await Circle.create({
                circleName: circleName,
                country: country,
                city: city,
                eventTypeId: eventTypeId,
                contactPerson: contactPerson,
                contactEmail: contactEmail,
                bio: bio || null,
                organizerId: user.id,
                logo: logoPath || null,
                banner: bannerPath || null,
                eventIntervalId: event_interval_id,
                instagram: instagram || undefined,
                twitter: twitter || undefined,
                website: website || undefined,
            });

            const avaUsername = avalanche.bintools.cb58Encode(
                Buffer.from(
                    await bcrypt.hash(
                        circleName,
                        Number(process.env.SALT_ROUNDS)
                    )
                )
            );
            const avaPassword = avalanche.encodedString(user.password);
            try {
                await avalanche.createUser(avaUsername, avaPassword);
            } catch (e) {
                if (e.message == `user already exists: ${circleName}`) {
                    console.log("User already created");
                } else {
                    throw e;
                }
            }

            const { xChain, cChain } = await avalanche.createAddress(
                avaUsername,
                avaPassword
            );

            const wallet = await Wallet.create({
                walletAddress: xChain,
                cChainAddress: cChain,
                username: avaUsername,
            });

            await circle.update({
                walletId: wallet.id,
            });

            return {
                status: 200,
                message: "Ok",
                circle,
            };
        } catch (error) {
            throw error;
        }
    }

    async changeCircleOwner(options: {
        circleId: number | string;
        userId: number | string | undefined;
        email: string | undefined;
        token: any;
    }): Promise<{ status: number; message: string; circle }> {
        try {
            const ava = new AvalancheApi();
            const { circleId, userId, email, token } = options;
            const mail = new Mail();

            if (!circleId && Number(Boolean(userId)) ^ Number(Boolean(email))) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: `Attribute ${!circleId ? "circleId" : ""} ${
                        !userId ? "userId" : ""
                    } ${!email ? "email" : ""} must be provided!`,
                });
            }

            const circle = await tryGetCircle(circleId, {
                include: [Wallet],
            });

            const previousOwnerId = circle.getDataValue("organizerId");
            const user = !!userId
                ? await tryGetUser(userId)
                : await User.findOne({
                      where: {
                          email: {
                              [Op.iLike]: email,
                          },
                      },
                  });
            const permissions = await CirclePermissions.findAll({
                where: {
                    [Op.or]: [
                        {
                            permission: "Owner [Full access]",
                        },
                        {
                            permission: "Admin [Admin access]",
                        },
                    ],
                },
                order: [["id", "ASC"]],
            });

            if (Number(token.verify.user.id) !== Number(circle.organizerId)) {
                throw new CustomError({
                    status: 403,
                    message: "Permission denied",
                });
            }

            if (!user) {
                throw new CustomError({
                    status: 500,
                    message: "This user isn't registred",
                });
            }

            if (previousOwnerId === user.id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "You cannot add yourself as an owner.",
                });
            }

            const wallet = await circle.getWallet();
            const newPassword = ava.encodedString(user.password);
            const { username, password } = await circle.getWalletCredentials();
            console.log(
                username,
                ava.encodedString(password) ===
                    "2FxpSY3cJ1CDaw624nrn9kS3N9JCv1LVLCJANpzMPGsW23muEt7i2r4b6Wru2JRUFTLQ9UHHwPfaYdAzxM3FSzFtQBcm9pi4mEQcvJtcDPhgh6N381LPJFeo2LCRG",
                password
            );
            const pkey = await ava.xChainExportKey(
                username,
                password,
                circle.wallet.walletAddress
            );
            await ava.deleteUser(username, password);
            console.log("here");
            await ava.createUser(username, newPassword);

            await ava.xChainImportKey(username, newPassword, pkey);
            await ava.cChainImportKey(username, newPassword, pkey);

            let updatedCircle = await Circle.update(
                {
                    organizerId: user.getDataValue("id"),
                },
                {
                    where: {
                        id: circle.getDataValue("id"),
                    },
                }
            );

            const existing = await CircleContributors.findOne({
                where: {
                    userId: user.id,
                    circleId: circle.id,
                },
                include: [CirclePermissions],
            });

            if (existing) {
                await existing.destroy();
            }

            await CircleContributors.create({
                userId: previousOwnerId,
                circleId: circle.id,
                circle_permissionId: permissions[0].getDataValue("id"),
            });

            await mail.sendCircleContributorMessageToRegistredUser({
                circle,
                sender_userId: previousOwnerId,
                contributorId: user.id,
            });

            return {
                status: 200,
                message: "OK",
                circle: updatedCircle,
            };
        } catch (error) {
            throw error;
        }
    }

    async getCircle(options: { id: string | number }): Promise<{
        status: number;
        message: string;
        circle: Circle;
    }> {
        try {
            const { id } = options;

            if (!id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Parameter id is required.",
                });
            }
            const circle = await tryGetCircle(id, {
                include: [CircleEventInterval, CircleEventType, EventModel, 
                    { 
                        model: Paypal, 
                        attributes: { 
                            exclude: [ "access_token", "refresh_token" ] 
                        }
                    }
                ],
            });

            return {
                status: 200,
                message: "Ok",

                //TODO: Fix return object defenition to represent reality
                circle,
            };
        } catch (error) {
            throw error;
        }
    }

    async updateCircle(
        options: {
            id: number | string;
        },
        data: {
            name: string;
            logo: string;
            banner: string;
            shortLink: string;
            eventType: string;
            eventTypeId: number;
            eventInterval: string;
            eventIntervalId: number;
            instagram: string | undefined;
            twitter: string | undefined;
            website: string | undefined;
            token: any;
        }
    ): Promise<{ status: number; message: string; circle: any }> {
        try {
            const { id } = options;

            if (!id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Parameter id is required",
                });
            }

            if (data.shortLink) {
                data.shortLink = data.shortLink.toLowerCase();
            }

            if (data.eventType) {
                let eventTypeId = await CircleEventType.findOne({
                    where: {
                        name: data.eventType,
                    },
                });
                data.eventTypeId = eventTypeId.id;
                delete data.eventType;
            }

            if (data.eventInterval) {
                let eventIntervalId = await CircleEventInterval.findOne({
                    where: {
                        name: data.eventInterval,
                    },
                });
                data.eventIntervalId = eventIntervalId.id;
                delete data.eventInterval;
            }

            let file = new File();
            let logoPath;
            let bannerPath;

            if (data.logo) {
                console.log(data.logo);
                console.log(await file.uploadFile({ file: data.logo }));
                logoPath = (await file.uploadFile({ file: data.logo }))
                    ?.filePath;
                if (!logoPath) {
                    throw new CustomError({
                        status: HTTPStatus.BAD_REQUEST,
                        message: "invalid picture code",
                    });
                }
                data.logo = logoPath;
            }

            if (data.shortLink) {
                const searchShortLink: any = await Circle.findAndCountAll({
                    where: {
                        shortLink: data.shortLink,
                    },
                    paranoid: false,
                });

                if (searchShortLink.count) {
                    throw new CustomError({
                        status: HTTPStatus.BAD_REQUEST,
                        message: "Circle ID is not available",
                    });
                }
            }

            if (data.banner) {
                bannerPath = (await file.uploadFile({ file: data.banner }))
                    ?.filePath;
                if (!bannerPath) {
                    throw new CustomError({
                        status: HTTPStatus.BAD_REQUEST,
                        message: "invalid picture code",
                    });
                }
                data.banner = bannerPath;
            }

            const circleUpdated = await tryGetCircle(id);
            console.log(
                `--- Type of organizerId: ${typeof circleUpdated.organizerId} ---\n--- Type of token user id: ${typeof data
                    .token.verify.user.id} ---\n--- IDs: ${
                    data.token.verify.user.id
                } ${circleUpdated.organizerId} ---\n`
            );
            await checkUserPermsForCircle(
                circleUpdated,
                data.token.verify.user,
                EPERM.ADMIN
            );

            await circleUpdated.update(data);

            return {
                status: 200,
                message: "Ok",
                circle: circleUpdated,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async addContributor(options: {
        token: ValidateJWTResponse;
        circleId: number | string;
        userId: number | string;
        permissions: string;
        email: string;
    }) {
        // Data date blyaaaaaaaaaaaaa

        const { token, circleId, userId, permissions, email } = options;
        const mail = new Mail();
        let newUser: boolean = false;

        try {
            if (!circleId && !(userId || email) && !permissions) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: `Parameters ${!circleId ? "circleId" : ""} ${
                        !(userId || email) ? "userId or email" : ""
                    } ${!permissions ? "permissions" : ""} required`,
                });
            }
            let permission, user: User, contributor: CircleContributors;
            if (typeof permissions == "string") {
                permission = await CirclePermissions.findOne({
                    where: {
                        permission: permissions,
                    },
                });
            } else {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Invalid data type for permission",
                });
            }

            if (!permission) {
                throw new CustomError({
                    status: 404,
                    message: "Invalid permissions",
                });
            }

            if (userId) {
                user = await tryGetUser(userId);
            } else {
                user = await User.findOne({
                    where: {
                        email: {
                            [Op.iLike]: `%${email.toLowerCase()}%`,
                        },
                    },
                });
            }

            const circle: Circle = await tryGetCircle(circleId);

            if (token.verify.user.id === user.id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "You can not add yourself as a contributor",
                });
            }

            if (user.id === circle.organizerId) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "This user is circle owner",
                });
            }

            if (token.verify.user.id != circle.organizerId) {
                await checkUserPermsForCircle(
                    circle,
                    token.verify.user,
                    EPERM.ADMIN
                );
            }

            if (!user) {
                newUser = true;
                const randInt = (start, end) =>
                    Math.floor(start + Math.random() * (end - start));
                const char = (x) => String.fromCharCode(x);
                const randomPassword =
                    crypto.randomBytes(10).toString("hex") +
                    "@" +
                    char(randInt(35, 38));
                const hash: string = await bcrypt.hash(
                    randomPassword,
                    Number(process.env.SALT_ROUNDS) || 10
                );

                user = await User.create({
                    email: email.toLowerCase(),
                    fullName: "Name Surname",
                    password: hash,
                    profileId: (
                        await Profile.create({
                            location: "World, World",
                        })
                    ).id,
                });

                await mail.sendCircleContributorMessageToUnregistredUser({
                    circle: circle,
                    credentials: {
                        login: email,
                        password: randomPassword,
                    },
                    inviter: token.verify.user,
                });
            }

            const existing = await CircleContributors.findOne({
                where: {
                    userId: user.id,
                    circleId: circle.id,
                },
                include: [CirclePermissions],
            });

            if (existing) {
                if (
                    Number(existing.circle_permissionId) ==
                    Number(permission.id)
                ) {
                    throw new CustomError({
                        status: HTTPStatus.BAD_REQUEST,
                        message: "This user is already a contributor",
                    });
                }

                const updated = await existing.update({
                    circle_permissionId: permission.id,
                });

                return {
                    status: 200,
                    message: "Ok",
                    contributor: updated,
                };
            }

            contributor = await CircleContributors.create({
                userId: user.id,
                circle_permissionId: permission.id,
                circleId: circle.id,
            });

            if (!newUser) {
                await mail.sendCircleContributorMessageToRegistredUser({
                    circle: circle,
                    sender_userId:
                        token.verify.user.shortLink || token.verify.user.id,
                    contributorId: user.shortLink || user.id,
                });
            }

            return {
                status: 200,
                message: "Ok",
                contributor: contributor,
            };
        } catch (error) {
            throw error;
        }
    }
    
    async getContributors(options: {
        id: number | string;
    }): Promise<{
        status: number;
        message: string;
        contributors: Array<object>;
    }> {
        const { id } = options;

        if (!id) {
            throw new CustomError({
                status: HTTPStatus.BAD_REQUEST,
                message: "Property id isn't passed",
            });
        }

        const circle = await tryGetCircle(id);

        let contributors = await CircleContributors.findAll({
            where: {
                circleId: circle.id,
            },
            include: [
                {
                    model: User,
                    include: [Profile],
                    attributes: {
                        exclude: ["password"],
                    },
                },
                CirclePermissions,
            ],
        });

        return {
            status: 200,
            message: "Ok",
            contributors: contributors,
        };
    }

    async getOwner(organizerId: number) {
        return await User.findOne({
            where: {
                id: organizerId
            },
            include: [Profile],
            attributes: {
                exclude: ["password"]
            }
        });
    }

    async deleteContributor(options: {
        token: ValidateJWTResponse;
        circleId: number | string;
        contributorId: number;
    }): Promise<any> {
        const { token, circleId, contributorId } = options;

        if (!circleId && !contributorId) {
            throw new CustomError({
                status: 403,
                message: `${!circleId ? "circleId " : ""}${
                    !contributorId ? "contributorId " : ""
                } required!`,
            });
        }

        const user = token.verify.user;

        const cirlce = await tryGetCircle(circleId);

        const initiatorPerms = await CircleContributors.findOne({
            where: {
                userId: contributorId,
                circleId: cirlce.id,
            },
            include: [CirclePermissions],
        });

        const contributor = await CircleContributors.findOne({
            where: {
                userId: contributorId,
                circleId: cirlce.id,
            },
        });

        const requestedContributor = await CircleContributors.findOne({
            where: {
                userId: Number(user.id),
                circleId: cirlce.id,
            },
            include: [User],
        });

        if (!contributor) {
            throw new CustomError({
                status: 404,
                message: "Contributor not found",
            });
        }
        appAssert(contributorId !== cirlce.organizerId, 'You cannot delete circle owner', HTTPStatus.FROBIDDEN);

        if (token.verify.user.id != contributor.id) {
            await checkUserPermsForCircle(cirlce, user, EPERM.ADMIN);

            appAssert(
                requestedContributor.circle_permissionId != contributor.circle_permissionId,
                "You can't delete contributor with same permissions",
                HTTPStatus.FROBIDDEN
            );
        }

        await contributor.destroy();

        return {
            status: 200,
            message: "Ok",
        };
    }

    async deleteCircle(options: {
        id: number | string;
        token: ValidateJWTResponse;
    }): Promise<{ status: number; message: string }> {
        try {
            const { id, token } = options;
            if (!id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Parameter id is required.",
                });
            }
            const circle = await tryGetCircle(id, {
                include: [EventModel],
            });

            if (circle.organizerId != token.verify.user.id) {
                throw new CustomError({
                    status: 403,
                    message: "Only circle owner can do that",
                });
            }

            for (const event of circle.events) {
                await event.destroy();
            }

            await circle.destroy();

            return {
                status: 200,
                message: "Ok",
            };
        } catch (e) {
            throw e;
        }
    }

    async getUserCircles(options: {
        id: number | string;
    }): Promise<{ status: number; message: string; circles: Array<object> }> {
        try {
            let { id } = options;

            if (!id) {
                throw new CustomError({
                    status: HTTPStatus.BAD_REQUEST,
                    message: "Parameter id is required",
                });
            }
            const user = await tryGetUser(id);

            let circles = await Circle.findAll({
                where: {
                    organizerId: user.id,
                },
                include: [CircleEventInterval, CircleEventType],
            });

            return {
                status: 200,
                message: "Ok",
                circles: circles,
            };
        } catch (error) {
            throw error;
        }
    }

    public async getFollowers({
        circleId,
        onlyCount,
    }: {
        onlyCount: boolean;
        circleId: number;
    }): Promise<any> {
        const circle = await Circle.findByPk(circleId);
        if (!circle) {
            throw new CustomError({ status: 404, message: "Circle not found" });
        }
        const count = await circle.countFollowers();
        let followers = [];
        if (onlyCount) {
            followers = await circle.getFollowers({
                include: {
                    model: User,
                    as: "fromUser",
                    attributes: {
                        exclude: ["password"],
                    },
                },
            });
            if (!followers.length) {
                throw new CustomError({
                    status: 404,
                    message: "No followers found",
                });
            }
            followers = followers.map((e) => ({
                id: e.id,
                fromUser: e.fromUser,
            }));
        }

        return {
            status: 200,
            message: "OK",
            total: count,
            followers,
        };
    }

    async getCircleStats({
        circleId,
    }: {
        circleId: number;
    }): Promise<any> {
        appAssert(circleId, "Bad request, `circleId` is required", HTTPStatus.BAD_REQUEST)
        
        const eventIds = await EventModel.findAll({
            include: {
                model: Circle,
                where: {
                    id: circleId
                },
                attributes: []
            },
            attributes: [],
        }).then(events => events.map(x => x.id));

        const genderPromise = NftBalance.findAll({
            include: [{
                model: User,
                include: [{
                    model: Profile,
                    include: [{
                        model: Gender,
                        attributes: ["gender"]
                    }]
                }]
            }, {
                model: Ticket,
                where: {
                    EventModelId: {
                        [Op.in]: eventIds
                    }
                }
            }]
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
                verified: true
            },
            include: {
                model: Ticket,
                where: {
                    EventModelId: {
                        [Op.in]: eventIds
                    }
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

        const totalTicketCopiesPromise = Ticket.sum('copies', {
            where: {
                EventModelId: {
                    [Op.in]: eventIds
                }
            }
        });

        const totalSoldPromise = Ticket.sum('minted', {
            where: {
                EventModelId: {
                    [Op.in]: eventIds
                }
            }
        });

        const totalAttendeesPromise = NftBalance.count({
            where: {
                verified: true
            },
            include: {
                model: Ticket,
                where: {
                    EventModelId: {
                        [Op.in]: eventIds
                    }
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

        return {
            status: 200,
            message: "Ok",

            totalTicketCopies,
            totalSold,
            totalAttendees,
            averageTime,
            gender,
        };
    }
}

export { EPERM };
