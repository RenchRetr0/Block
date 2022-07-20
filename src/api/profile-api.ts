import File from "./file";
import is from "is_js";
import dotenv from "dotenv";
import CustomError from "../CustomError";
import User from "../database/models/User";
import sequelize from "../database/sequelize";
import { Sequelize } from "sequelize-typescript";
import Profile from "../database/models/Profile";
import Interest from "../database/models/Interest";
import Follow from "../database/models/Follow";
import { ValidateJWTResponse } from "./auth-api";
import Circle from "../database/models/Circle";
import NftBalance from "../database/models/NftBalance";
import Ticket from "../database/models/Ticket";
import { tryGetCircle, tryGetUser } from "./commom";
import Like from "../database/models/Likes";
import EventModel from "../database/models/Events";
import Contributors from "../database/models/CircleContributors";
import Permissions from "../database/models/CirclePermissions";
import { ValidationError, Op } from "sequelize";
import Gender from "../database/models/Gender";
import { JwtHeader } from "jsonwebtoken";
import Paypal from "../database/models/Paypal";
import { Wallet } from "@ethersproject/wallet";
dotenv.config();

export default class ProfileApi {
    sequelize: Sequelize;

    constructor() {
        this.sequelize = sequelize;
    }

    public async getUser(options: { id: number | string }): Promise<any> {
        try {
            const { id } = options;

            if (!id) {
                throw new CustomError({
                    status: 400,
                    message: "Parameters is required.",
                });
            }
            const user = await tryGetUser(id, {
                include: [
                    {
                        model: Profile,
                        include: [Interest, Gender]
                    }
                ],
                attributes: {
                    exclude: ["password"],
                },
            });

            const balance = await NftBalance.findAll({
                where: {
                    walletId: user.walletId,
                    isPublic: true,
                },
                include: [Ticket],
            });

            return {
                status: 200,
                message: "OK",
                user,
                balance
            };
        } catch (e) {
            throw e;
        }
    }

    public async getUserAttributes(
        options: { 
            token: ValidateJWTResponse,
            userAttributes: string[],
            profileAttributes: string[],
            paypalAttributes: string[],
            walletAttributes: string[],
        },
    ): Promise<any> {
        try {
            const { 
                token, 
                userAttributes, 
                profileAttributes, 
                paypalAttributes, 
                walletAttributes 
            } = options;

            const user = await tryGetUser(token.verify.user.id, {
                include: [
                    {
                        model: Profile,
                        attributes: profileAttributes,
                    },
                    {
                        model: Paypal,
                        attributes: {
                            include: paypalAttributes,
                            exclude: ["access_token", "refresh_token"]
                        },
                    },
                    {
                        model: Wallet,
                        attributes: walletAttributes
                    }
                ],
                attributes: {
                    include: userAttributes,
                    exclude: ["password"]
                },
            });

            return {
                status: 200,
                message: "OK",
                user
            };
        } catch (e) {
            throw e;
        }
    }

    public async editProfile(options: {
        id: number | string;
        token: any;
        fullName?: string;
        email?: string;
        location?: string;
        banner?: string;
        phone?: string;
        interests?: Array<string>;
        avatar?: string;
        shortLink?: string;
        instagram?: string;
        website?: string;
        twitter?: string;
        gender?: string;
        birthday?: string | Date;        
    }) {
        try {
            const {
                id,
                token,
                fullName,
                location,
                banner,
                phone,
                interests,
                avatar,
                shortLink,
                instagram,
                website,
                twitter,
                gender,
                birthday,
            } = options;
            let profile, avatarPath, bannerPath;
            const file = new File();
            
            await Gender.bulkCreate(
                [
                    // мужчина
                    { id: 1, gender: 'Male'},
                    // женсчина
                    { id: 2, gender: 'Female'},
                    // другое
                    { id: 3, gender: 'Another'},
                ], { ignoreDuplicates: true }
            );
            
            if (!id) {
                throw new CustomError({
                    status: 400,
                    message: "Parameter id is required.",
                });
            }

            // console.log(`--- Token ID: ${token.verify.user.id} ---\n--- User ID: ${id} ---\n--- Token ID: ${token.verify.user.shortLink} ---\n--- Token ID: ${id} ---\n`)
            console.log(
                `--- Is user: ${
                    id !== token.verify.user.shortLink ||
                    Number(id) !== Number(token.verify.user.id)
                } ---\n`
            );
            if (
                (typeof id === "string" &&
                    id !== token.verify.user.shortLink) ||
                (typeof id === "number" && id !== Number(token.verify.user.id))
            ) {
                throw new CustomError({
                    status: 403,
                    message: "You cannot edit profile of current user.",
                });
            }

            const user = await tryGetUser(id, {
                include: [
                    {
                        model: Profile,
                        include: [
                            {
                                model: Interest,
                            },
                            {
                                model: Gender
                            }
                        ],
                    },
                ],
                attributes: {
                    exclude: ["password"],
                },
            });

            if (shortLink) {
                const searchShortLink = await User.findAndCountAll({
                    where: {
                        shortLink: shortLink,
                    },
                });

                if (
                    searchShortLink.count &&
                    token.verify.user.shortLink !== shortLink
                ) {
                    throw new ValidationError("User ID is not available", [
                        {
                            message: "User ID is not available",
                            type: null,
                            path: null,
                            value: shortLink,
                            instance: null,
                            validatorKey: "short_link",
                            validatorName: null,
                            validatorArgs: [],
                            original: new Error("User ID is not available"),
                        },
                    ]);
                }
            }

            await user.update({
                fullName: fullName || undefined,
                shortLink:
                    shortLink && token.verify.user.shortLink !== shortLink
                        ? shortLink.toLowerCase()
                        : undefined,
            });

            avatarPath = await file.uploadFile({
                file: avatar,
            });

            bannerPath = await file.uploadFile({
                file: banner,
            });

            if (!user.profile) {
                profile = await Profile.create({
                    location: location || undefined,
                    banner: bannerPath?.filePath || undefined,
                    phone: phone || undefined,
                    avatar: avatarPath?.filePath || undefined,
                    instagram: instagram || undefined,
                    twitter: twitter || undefined,
                    website: website || undefined,
                });

                user.profileId = profile.id;
                await user.save();
            }

            await Profile.update(
                {
                    location: location || undefined,
                    banner: bannerPath?.filePath || undefined,
                    phone: phone || undefined,
                    avatar: avatarPath?.filePath || undefined,
                    instagram: instagram || undefined,
                    twitter: twitter || undefined,
                    website: website || undefined,
                },
                {
                    where: {
                        id: user.profileId,
                    },
                }
            );
            
            enum Genders {
                Male = 1, 
                Female = 2, 
                Another = 3
            }

            if (!!gender && gender in Genders) {
                await Profile.update(
                    { genderId: Genders[gender]},
                    { where: {
                        id: user.profileId,
                        },
                    }
                );
            }

            if (!!birthday) {
                let date = formatСhange(birthday);
                if (!validDate(birthday)) { 
                    throw new CustomError({
                        status: 400,
                        message: "Date syntax error.",
                    });
                }else if (date > new Date) {
                    throw new CustomError({
                        status: 400,
                        message: "Choose the right date.",
                    });
                }
                await Profile.update(
                    { birthday: date || undefined},
                    { where: {
                        id: user.profileId,
                        },
                    }
                );
            };

            if (!Array.isArray(interests)) {
                throw new CustomError({
                    status: 400,
                    message: "Interests must be an array!",
                });
            }

            if (interests) {
                await Interest.destroy({
                    where: {
                        profileId: user.profileId,
                    },
                });
                await Interest.bulkCreate(
                    interests.map((x) => ({
                        interest: x,
                        profileId: user.profileId,
                    }))
                );
            }

            await user.reload();

            return {
                status: 200,
                message: "OK",
                user,
            };
        } catch (e) {
            throw e;
        }
    }

    public async getAll() {
        try {
            const users = await User.findAll({
                include: [
                    {
                        model: Profile,
                        include: [
                            {
                                model: Interest,
                            },
                        ],
                    },
                ],
                attributes: {
                    exclude: ["password"],
                },
            });

            if (!users) {
                throw new CustomError({
                    status: 500,
                    message:
                        "Internal server error: cannot connect to database.",
                });
            }

            return {
                status: 200,
                message: "OK",
                users,
            };
        } catch (e) {
            throw e;
        }
    }

    public async deleteUser(options: { id: string | number }): Promise<{
        status: number;
        message: string;
    }> {
        try {
            const { id } = options;

            if (!id) {
                throw new CustomError({
                    status: 400,
                    message: "Parameter id is required.",
                });
            }
            const user = await tryGetUser(id);

            await user.destroy();

            return {
                status: 200,
                message: "Ok",
            };
        } catch (error) {
            throw error;
        }
    }

    public async follow({
        token,
        circleId,
        userId,
        readonly,
    }: {
        token: ValidateJWTResponse;
        circleId?: number | string;
        userId?: number | string;
        readonly: boolean;
    }): Promise<any> {
        if (userId && circleId) {
            throw new CustomError({
                status: 400,
                message:
                    "Malformed request, passign to targest at the same time",
            });
        }

        if (!userId && !circleId) {
            throw new CustomError({
                status: 400,
                message:
                    "Malformed request, no targest, set cirlceId or userID",
            });
        }

        let foundCircle: Circle;
        let foundUser: User;
        if (circleId !== undefined) {
            foundCircle = await tryGetCircle(circleId);
        }

        if (userId !== undefined) {
            foundUser = await tryGetUser(userId);
        }

        let follow = await Follow.findOne({
            where: {
                fromUserId: token.verify.user.id,
                circleId: foundCircle?.id || null,
                toUserId: foundUser?.id || null,
            },
        });

        if (follow && !readonly) {
            await follow.destroy();
            return {
                status: 200,
                message: "OK",
                following: false,
            };
        }

        if (!readonly) {
            follow = await Follow.create({
                fromUserId: token.verify.user.id,
                circleId: foundCircle?.id || null,
                toUserId: foundUser?.id || null,
            });
        }

        return {
            status: 200,
            message: "OK",
            following: !!follow,
        };
    }

    // Who i follow
    public async getFollowing({ token }: { token: ValidateJWTResponse }): Promise<any> {
        const user = await tryGetUser(token.verify.user.id);

        const userFollows = await user.getFollowing({
            include: [
                {
                    model: User,
                    as: "toUser",
                    include: [Profile],
                },
                Circle,
            ],
        });
        if (!userFollows.length) {
            throw new CustomError({
                status: 404,
                message: "No user follows found",
            });
        }

        return {
            status: 200,
            message: "OK",
            userFollows: userFollows,
        };
    }
    //Who follows me
    public async getFollowers({
        userId,
        onlyCount,
    }: {
        onlyCount: boolean;
        userId: number;
    }): Promise<any> {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new CustomError({ status: 404, message: "User not found" });
        }
        const count = await user.countFollowers();
        let followers = [];
        if (onlyCount) {
            followers = await user.getFollowers({
                include: {
                    model: User,
                    as: "fromUser",
                    include: [Profile],
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

    public async privateStatus({ id }: { id: number | string }): Promise<any> {
        return {
            status: 200,
            message: "Ok",
            isPrivate: (await tryGetUser(id)).FlashBsPrivate,
        };
    }

    public async setPrivate({
        token,
        state,
    }: {
        token: ValidateJWTResponse;
        state: boolean;
    }): Promise<any> {
        const updated = await token.verify.user.update({
            FlashBsPrivate: state,
        });
        return {
            status: 200,
            message: "Ok",
            updated,
        };
    }

    public async getLiked({
        userId,
    }: {
        userId: string | number;
    }): Promise<any> {
        const user = await tryGetUser(userId);
        const likes = await Like.findAll({
            where: {
                userId: user.id,
            },
            include: {
                model: EventModel,
            },
        });

        return {
            status: 200,
            message: "Ok",
            liked: likes.map((e) => e.event).filter((x) => x !== null),
        };
    }

    public async getContributing({
        userId,
    }: {
        userId: string | number;
    }): Promise<any> {
        const user = await tryGetUser(userId);
        const contributing = await Contributors.findAll({
            where: {
                userId: user.id,
            },
            include: [Circle, Permissions],
        });

        return {
            status: 200,
            message: "Ok",
            contributing: contributing
                .map((e) =>
                    e.circle
                        ? { circle: e.circle, role: e.circle_permissions }
                        : null
                )
                .filter((x) => x !== null),
        };
    }

    public async setMerchantAgree(
        options: {
            merchantAgree: boolean,
            token: ValidateJWTResponse
        }
    ): Promise<{ status: number; message: string}> {
        try {
            const { token, merchantAgree } = options;
            const id = token.verify.user.id;

            if (typeof merchantAgree != "boolean") {
                throw new CustomError({
                    status: 400,
                    message: "merchantAgree should be boolean.",
                });
            }

            const userUpdated = await tryGetUser(id);
            await userUpdated.update({ merchantAgree });

            return {
                status: 200,
                message: "Ok"
            };

        } catch (error) {
            throw error;
        }
    }

    public async isMerchantAgree(
        options: {
            token: ValidateJWTResponse
        }
    ): Promise<{ status: number; message: string, merchantAgree: boolean }> {
        try {
            const id = options.token.verify.user.id;

            const merchantAgree = await tryGetUser(id, {
                attributes: ['merchantAgree']
            }).then(x => x.merchantAgree);

            return {
                status: 200,
                message: "Ok",
                merchantAgree: merchantAgree
            };

        } catch (error) {
            throw error;
        }
    }
}

function validDate(date) {
    let d_arr = date.split('.');
    let d = new Date(`${d_arr[2]}/${d_arr[1]}/${d_arr[0]}`);
    if (d_arr[2]!=d.getFullYear() || d_arr[1]!=(d.getMonth() + 1) || d_arr[0]!=d.getDate()) {
      return false;
    };
    return true;
};

function formatСhange(date) {
    let d_arr = date.split('.');
    let d = new Date(`${d_arr[2]}/${d_arr[1]}/${d_arr[0]}`);
    return d;
};
