import Mail from "./mail";
import is from "is_js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import CustomError from "../CustomError";
import User from "../database/models/User";
import Verification from "../database/models/Verification";
import Interest from "../database/models/Interest";
import Profile from "../database/models/Profile";
import AvalancheApi from "../avalanche/avalanche-api";
import Wallet from "../database/models/Wallet";
import * as crypto from "crypto";
import { Buffer } from "avalanche";
import { appAssert, tryGetUser } from "./commom";
import PasswordResetRequests from "../database/models/PasswordResetRequest";
import Circle from "../database/models/Circle";
import { Op } from "sequelize";
import { HTTPStatus } from "../utils";
import EmailChangeRequests from '../database/models/EmailChangeRequest';
dotenv.config();

interface GenericResponse {
    status: number;
    message: string;
}

export interface ValidateJWTResponse extends GenericResponse {
    verify: {
        user: User;
        iat: number;
        exp: number;
    };
}

export default class AuthApi {
    public static async registrationForMint(
        name: string,
        userEmail: string,
        ppAccept: boolean,
        newsLetter: boolean
    ) {
        try {
            appAssert(name, "Name is required", HTTPStatus.BAD_REQUEST),
                appAssert(
                    userEmail, 
                    "Email is required", 
                    HTTPStatus.BAD_REQUEST
                ),
                appAssert(
                    ppAccept,
                    "You must accept our privacy policy to sign up",
                    HTTPStatus.BAD_REQUEST
                ),
                appAssert(
                    is.email(userEmail),
                    "Invalid email address format",
                    HTTPStatus.BAD_REQUEST
                );
            const email = userEmail.toLowerCase();
            const avalanche: AvalancheApi = new AvalancheApi();
            const mail: Mail = new Mail();
            const user: User = await User.findOne({
                where: {
                    email,
                },
            });
            appAssert(
                !user,
                `User with email ${email} already exists`,
                HTTPStatus.BAD_REQUEST
            );
            const randInt = (start, end) =>
                Math.floor(start + Math.random() * (end - start));
            const char = (x) => String.fromCharCode(x);
            const randomPassword: string = `${crypto
                .randomBytes(10)
                .toString("hex")}@${char(randInt(35, 38))}`;
            const username: string = avalanche.encodedString(
                await bcrypt.hash(email, Number(process.env.SALT_ROUNDS) || 10)
            );
            const password: string = await bcrypt.hash(
                randomPassword,
                Number(process.env.SALT_ROUNDS) || 10
            );
            await avalanche.createUser(username, password);
            const { xChain, cChain } = await avalanche.createAddress(
                username,
                password
            );
            let newUser: User = await User.create({
                fullName: name,
                email,
                password,
                verificationId: (
                    await Verification.create({
                        token: crypto.randomBytes(64).toString("hex"),
                        verified: true,
                    })
                ).id,
                walletId: (
                    await Wallet.create({
                        username,
                        walletAddress: xChain,
                        cChainAddress: cChain,
                    })
                ).id,
                profileId: (
                    await Profile.create({
                        location: "World, World",
                    })
                ).id,
                newsLetter: newsLetter || false,
            });
            const token = jwt.sign(
                {
                    data: {
                        id: newUser.id,
                        fullName: newUser.fullName,
                        email: newUser.email,
                        createdAt: newUser.createdAt,
                        updatedAt: newUser.updatedAt,
                    },
                },
                process.env.TOKEN_SECRET,
                {
                    expiresIn: "86400000",
                }
            );

            await mail.mintSignUp(email, randomPassword);

            return {
                status: 200,
                message: "OK",
                user: await User.findOne({
                    where: {
                        email,
                    },
                    attributes: {
                        exclude: ["password"],
                    },
                }),
                token,
            };
        } catch (e) {
            throw e;
        }
    }

    public static async signUp(options: {
        fullName: string;
        email: string;
        password: string;
        newsLetter: boolean;
        ppAccept: boolean;
    }): Promise<any> {
        try {
            options.email = options.email.toLowerCase();
            const { fullName, email, password, newsLetter, ppAccept } = options;
            const avalanche = new AvalancheApi();

            if (!fullName || !email || !password || newsLetter === undefined) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            if (!ppAccept) {
                throw new CustomError({
                    status: 400,
                    message: "You must accept our privacy policy to sign up",
                });
            }

            if (!is.email(email)) {
                throw new CustomError({
                    status: 400,
                    message: "Invalid email address",
                });
            }

            if (
                password.search(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\(\)\[\]\{\}\~?<>;:\\_\/`+=\-\|!@#\$%\^&\*\.])(?=.{8,})/i
                ) === -1
            ) {
                throw new CustomError({
                    status: 400,
                    message:
                        "Password must be at least 8 characters, must contain 1 special character and number.",
                });
            }

            const user = await User.findOne({
                where: {
                    email: {
                        [Op.iLike]: `%${email}%`,
                    },
                },
                attributes: {
                    exclude: ["password"],
                },
                paranoid: false,
            });

            if (user) {
                throw new CustomError({
                    status: 400,
                    message: "User already exists",
                });
            }

            const profile: Profile = await Profile.create({
                location: "World, World",
            });
            const passwordHash = await bcrypt.hash(
                password,
                Number(process.env.SALT_ROUNDS) || 10
            );
            const createdUser = await User.create({
                fullName: fullName,
                email: email,
                password: passwordHash,
                newsLetter: newsLetter,
                registeredFrom: "flashback",
                profileId: profile.id,
            });

            if (!createdUser) {
                throw new CustomError({
                    status: 500,
                    message:
                        "Internal server error: could not connect to database.",
                });
            }

            const username: string = avalanche.bintools.cb58Encode(
                Buffer.from(
                    await bcrypt.hash(email, Number(process.env.SALT_ROUNDS))
                )
            );

            await avalanche.createUser(username, passwordHash);
            const { xChain, cChain } = await avalanche.createAddress(
                username,
                passwordHash
            );
            const wallet = await Wallet.create({
                walletAddress: xChain,
                cChainAddress: cChain,
                username: username,
            });

            await createdUser.update({
                walletId: wallet.id,
            });

            const mail = new Mail();
            const message = await mail.signUpMail({
                email: email,
                fullName: fullName,
            });

            console.log(message);

            return {
                status: 201,
                message: "User was successfully created.",
            };
        } catch (e) {
            throw e;
        }
    }

    public static async signIn(options: {
        email: string;
        password: string;
    }): Promise<any> {
        try {
            options.email = options.email.toLowerCase();
            const { email, password } = options;

            if (!email || !password) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            if (!is.email(email)) {
                throw new CustomError({
                    status: 400,
                    message: "Invalid email address",
                });
            }

            const user = await User.findOne({
                include: [Verification, Wallet],
                where: {
                    email: {
                        [Op.iLike]: `%${email}%`,
                    },
                },
            });

            if (!user) {
                throw new CustomError({
                    status: 404,
                    message: "Cannot find user with current email address.",
                });
            }

            if (!user.verification.verified) {
                throw new CustomError({
                    status: 400,
                    message: "Verify your account to sign in.",
                });
            }

            const hashCompare = await bcrypt.compare(password, user.password);
            if (!hashCompare) {
                throw new CustomError({
                    status: 400,
                    message: "Invalid email or password.",
                });
            }

            if (!user.wallet) {
                const avalanche: AvalancheApi = new AvalancheApi();
                const username: string = avalanche.bintools.cb58Encode(
                    Buffer.from(
                        await bcrypt.hash(
                            email,
                            Number(process.env.SALT_ROUNDS)
                        )
                    )
                );
                await avalanche.createUser(username, user.password);
                const { xChain, cChain } = await avalanche.createAddress(
                    username,
                    user.password
                );
                const wallet: Wallet = await Wallet.create({
                    walletAddress: xChain,
                    cChainAddress: cChain,
                    username: username,
                });
                await user.update({
                    walletId: wallet.id,
                });
            }

            const token = jwt.sign(
                {
                    data: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                },
                process.env.TOKEN_SECRET,
                {
                    expiresIn: "86400000",
                }
            );

            await user.reload({
                attributes: {
                    exclude: ["password"],
                },
            });

            return {
                status: 200,
                message: "OK",
                user,
                token,
            };
        } catch (e) {
            throw e;
        }
    }

    public static async validate(options: { token: string }) {
        try {
            const { token } = options;

            if (!token) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            if (!options) {
                throw new CustomError({
                    status: 400,
                    message: "Parameters are required.",
                });
            }

            const verifyRecord = await Verification.findOne({
                where: {
                    token: token,
                },
            });

            if (!verifyRecord) {
                throw new CustomError({
                    status: 404,
                    message: "Verification token is not defined.",
                });
            }

            const verified = await verifyRecord.update({
                verified: true,
                verifiedAt: new Date(),
            });

            if (!verified) {
                throw new CustomError({
                    status: 500,
                    message: "Internral server error: cannot verify account.",
                });
            }

            return {
                status: 200,
                message: "OK",
            };
        } catch (e) {
            throw e;
        }
    }

    public static async validateJwt(options: { token: string }) {
        try {
            const { token } = options;

            if (!token) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            if (!options) {
                throw new CustomError({
                    status: 400,
                    message: "Parameters is required.",
                });
            }

            const verify = await jwt.verify(token, process.env.TOKEN_SECRET);

            if (typeof verify === "string") {
                throw new CustomError({
                    status: 500,
                    message: "Internal server error",
                });
            }

            if (!verify) {
                throw new CustomError({
                    status: 401,
                    message: "Unauthorized.",
                });
            }

            const user = await User.findByPk(verify.data.id, {
                include: [
                    {
                        model: Profile,
                        include: [Interest],
                    },
                ],
                attributes: {
                    exclude: ["password"],
                },
            });

            if (!user) {
                throw new CustomError({
                    status: 404,
                    message: "User does not exist.",
                });
            }

            return {
                status: 200,
                message: "OK",
                verify: {
                    user,
                    iat: verify.iat,
                    exp: verify.exp,
                },
            };
        } catch (e) {
            throw e;
        }
    }

    public static async deleteUser(id: number | string): Promise<any> {
        const avalanche = new AvalancheApi();
        const user = await tryGetUser(id, {
            include: [Wallet],
        });
        // FIXME:
        // No permission checks? Really?
        await user.destroy();

        return {
            status: 200,
            message: "User was successfully deleted.",
        };
    }

    public static async changePassword({
        token,
        newPassword,
        oldPassword,
    }: {
        token: ValidateJWTResponse;
        newPassword: string;
        oldPassword: string;
    }): Promise<GenericResponse> {
        const { user: _user } = token.verify;
        const user = await User.findByPk(_user.id, {
            include: [Circle],
        });

        const passwordHash = await bcrypt.hash(
            newPassword,
            Number(process.env.SALT_ROUNDS) || 10
        );
        const same = await bcrypt.compare(oldPassword, user.password);
        if (!same) {
            throw new CustomError({
                status: 400,
                message: "Old password does not match",
            });
        }
        const ava = new AvalancheApi();
        // Update user's cirlce password
        {
            if (user?.circle) {
                user.circle.map(async (circle: Circle) => {
                    const wallet = await circle.getWallet();
                    const newPassword = ava.encodedString(user.password);
                    const { username, password } =
                        await circle.getWalletCredentials();
                    const pkey = await ava.xChainExportKey(
                        username,
                        password,
                        wallet.walletAddress
                    );

                    await ava.deleteUser(username, password);
                    await ava.createUser(username, newPassword);

                    await ava.xChainImportKey(username, newPassword, pkey);
                    await ava.cChainImportKey(username, newPassword, pkey);
                });
            }
        }
        // Update user's wallet password
        {
            const wallet = await user.getWallet();
            const { username, password } = await user.getWalletCredentials();
            const pkey = await ava.xChainExportKey(
                username,
                password,
                wallet.walletAddress
            );

            await ava.deleteUser(username, password);
            await ava.createUser(username, passwordHash);

            await ava.xChainImportKey(username, passwordHash, pkey);
            await ava.cChainImportKey(username, passwordHash, pkey);
        }
        await user.update({
            password: passwordHash,
        });

        return {
            status: 200,
            message: "Password changed successfully",
        };
    }

    public static async callResetPassword(options: {
        email: string;
    }): Promise<GenericResponse> {
        const { email } = options;

        if (!email) {
            throw new CustomError({
                status: 400,
                message: "Email required",
            });
        }

        let user = await User.findOne({
            where: {
                email: {
                    [Op.iLike]: `%${email}%`,
                },
            },
        });

        if (!user) {
            throw new CustomError({
                status: 404,
                message: `User not found ${email}`,
            });
        }

        let resetHash = `prod_${crypto
            .randomBytes(32)
            .toString("hex")}${Math.floor(
            Math.random() * Number(process.env.SALT_ROUNDS) * 20
        )}`;

        await PasswordResetRequests.create({
            resetHash,
            userId: user.getDataValue("id"),
        });

        let mail = new Mail();

        try {
            await mail.sendResetPasswordMessage({ user, resetHash });
        } catch (error) {
            throw new CustomError({
                status: 500,
                message: "Can't send email, try again later",
            });
        }

        return {
            status: 200,
            message: `Follow the instructions in the email sent to the ${email}`,
        };
    }

    public static async resetPassword( options: {
        emailToken: string,
        email: string,
        newPassword: string
    } ) {
        const { emailToken, email, newPassword } = options;
        if (!emailToken) {
            throw new CustomError({
                status: 403,
                message: "Unauthorized",
            });
        }

        if (!newPassword && !email) {
            throw new CustomError({
                status: 400,
                message: "newPassword and email required",
            });
        }

        let resetRecord = await PasswordResetRequests.findOne({
            where: {
                resetHash: emailToken,
                reseted: false,
            },
        });

        if (!resetRecord) {
            throw new CustomError({
                status: 500,
                message: "This user didn't ask for password reset",
            });
        }

        let userId = resetRecord.getDataValue("userId");
        let user = await User.findByPk(userId, {
            include: [Circle],
        });
        const passwordHash = await bcrypt.hash(
            newPassword,
            Number(process.env.SALT_ROUNDS) || 10
        );
        const ava = new AvalancheApi();
        // Update user's cirlce password
        {
            if (user?.circle) {
                user.circle.map(async (circle: Circle) => {
                    const wallet = await circle.getWallet();
                    // 2 rounds of cb58
                    const newPassword = ava.encodedString(passwordHash);
                    const { username, password } =
                        await circle.getWalletCredentials();
                    const pkey = await ava.xChainExportKey(
                        username,
                        password,
                        wallet.walletAddress
                    );

                    await ava.deleteUser(username, password);
                    await ava.createUser(username, newPassword);

                    await ava.xChainImportKey(username, newPassword, pkey);
                    await ava.cChainImportKey(username, newPassword, pkey);
                });
            }
        }
        // OG pass: $2b$10$NsN7EAt1tNRyQGnJ1cFv3OipL5OUUpOBXR7LwXw8Uu.Z2rjUq.zGy
        // Update user's wallet password
        {
            const wallet = await user.getWallet();

            const { username, password } = await user.getWalletCredentials();
            const pkey = await ava.xChainExportKey(
                username,
                password,
                wallet.walletAddress
            );

            await ava.deleteUser(username, password);
            await ava.createUser(username, passwordHash);

            await ava.xChainImportKey(username, passwordHash, pkey);
            await ava.cChainImportKey(username, passwordHash, pkey);
        }
        await user.update({
            password: passwordHash,
        });

        await resetRecord.destroy();

        return {
            status: 200,
            message: "Password changed successfully",
        };
    }

    public static async changeEmailRequest(options: {
        token: ValidateJWTResponse,
        newEmail: string
    }) {
        const { token, newEmail } = options;
        const mail = new Mail();
        if ( !newEmail ) {
            throw new CustomError({
                status: 400,
                message: "New email isn't provided"
            })
        }

        if (!is.email(newEmail)) {
            throw new CustomError({
                status: 400,
                message: 'Invalid email address'
            });
        }

        let exists = await User.findAndCountAll({
            where: {
                email: newEmail
            }
        });

        if ( exists.count ) {
            throw new CustomError({
                status: 500,
                message: "This email already registred"
            })
        }

        let randomCode = Math.floor(Math.random() * 900000) + 100000;
        let randomHash = `prod_${crypto.randomBytes(32).toString('hex')}${Math.floor(Math.random() * Number(process.env.SALT_ROUNDS) * 20)}`;

        let request = await EmailChangeRequests.create(
            {
                changeCode: randomCode,
                oldEmail: token.verify.user.email.toLowerCase().trim(),
                newEmail: newEmail.toLowerCase().trim(),
                userId: token.verify.user.id,
                cancleHash: randomHash,
                expires: Date.now() + 86400 * 3
            }
        );

        await request.reload({
            include: [User]
        })

        await mail.sendChangeEmailMessage(request);
        
        return {
            status: 200,
            message: `The letter with the code was sent to ${newEmail}.`
        }
    }

    public static async changeEmail(options: {
        code: number,
        token: ValidateJWTResponse
    }) {
        const { code, token } = options;
        
        if ( !code ) {
            throw new CustomError({
                status: 400,
                message: "Code is required"
            });
        }

        if ( (code < 100000 && code > 999999) || isNaN(code) ) {
            throw new CustomError({
                status: 400,
                message: "Code is invalid"
            });
        }

        let request = await EmailChangeRequests.findOne({
            where: {
                changeCode: code,
                userId: token.verify.user.id
            },
            include: [
                User
            ]
        });

        if ( !request ) {
            throw new CustomError({
                status: 500,
                message: "This user didn't ask for email change or code is wrong"
            });
        }

        if ( Date.now() > request.expires ) {
            throw new CustomError({
                status: 500,
                message: "Your code expired, please ask for email changing again"
            })
        }

        try {
            await request.user.update({
                email: request.newEmail.toLowerCase().trim()
            });
        } catch (error) {
            throw new CustomError({
                status: 500,
                message: "Email already registred"
            });
        }

        await (new Mail()).sendEmailChanged(request);

        await request.update({
            resolved: true
        });

        return {
            status: 200,
            message: "ok",
            user: await request.user.reload({
                attributes: {
                    exclude: ["password"]
                }
            })
        }
    }

    public static async cancleEmailChanging(cancleHash: string) {
        if (!cancleHash) {
            throw new CustomError({
                status: 400,
                message: "cancleHash required!"
            })
        }

        let request = await EmailChangeRequests.findOne({
            where: {
                cancleHash
            },
            include: [
                {
                    model: User,
                    attributes: {
                        exclude: ["password"]
                    }
                }
            ]
        });

        if (!request) {
            throw new CustomError({
                status: 404,
                message: "We can't find your request"
            });
        }

        if ( request.expires < Date.now() ) {
            throw new CustomError({
                status: 500,
                message: "Your request has expired. Please try again"
            })
        }

        let exist = await User.findAndCountAll({
            where: {
                email: request.oldEmail.toLowerCase().trim()
            }
        });

        if (exist) {
            throw new CustomError({
                status: 500,
                message: `Email ${request.oldEmail.toLowerCase().trim()} is already registred`
            });
        }

        await request.user.update({
            email: request.oldEmail.toLowerCase().trim()
        });

        await request.update({
            resolved: false
        });

        return {
            status: 200,
            message: "ok",
            user: await request.user.reload({
                attributes: {
                    exclude: ["password"]
                }
            })
        }


    }
}

// const createAdmin = async () => {
//     const existingAdmin = await User.findOne({
//         where: {
//             email: process.env.ADMIN_EMAIL
//         }
//     });
//
//     if (!existingAdmin) {
//         const avalanche = new AvalancheApi();
//
//         const user = await User.create({
//             fullName: "Admin Account",
//             email: process.env.ADMIN_EMAIL,
//             password: await bcrypt.hash(process.env.ADMIN_PASSWORD, Number(process.env.SALT_ROUNDS))
//         });
//
//         const verification = await Verification.create({
//             token: crypto.randomBytes(10).toString('hex'),
//             verified: true,
//             verifiedAt: Date.now()
//         });
//
//         await user.update({
//             verificationId: verification.id
//         });
//
//         const xChainUser = await avalanche.createUser(
//             user.email,
//             user.password
//         );
//
//         const {xChain, cChain} = await avalanche.createAddress(
//             user.email,
//             user.password
//         );
//
//         const wallet = await Wallet.create({
//             walletAddress: xChain,
//             cChainAddress: cChain
//         });
//
//         await user.update({
//             walletId: wallet.id
//         });
//
//         console.log('Admin account created');
//     } else {
//         console.log('Admin already exists!');
//     }
// }
//
// createAdmin().then(() => console.log('Completed'))

// import sequelize from '../database/sequelize';
// const tickets = async () => {
//     await sequelize.sync({alter:true});
// }
// tickets().then().catch(e => console.log(e))
