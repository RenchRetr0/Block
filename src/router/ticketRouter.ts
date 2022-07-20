import express, { Request, Response } from "express";
import CustomError from "../CustomError";
import File from "../api/file";
import Ticket from "../database/models/Ticket";
import AvalancheApi from "../avalanche/avalanche-api";
import Wallet from "../database/models/Wallet";
import User from "../database/models/User";
import validateJWT from "../api/validateJWT";
import EventModel from "../database/models/Events";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Mail from "../api/mail";
import { Buffer } from "avalanche";
import NftBalance from "../database/models/NftBalance";
import dotenv from "dotenv";
import Circle from "../database/models/Circle";
import { IWalletOwner } from "../database/InterfaceDefenitions";
import { ethers } from "hardhat";
import { MinimalERC721, MinimalERC721__factory } from "../../typechain";
import { appAssert, tryGetEvent, tryGetUser } from "../api/commom";
import { ValidateJWTResponse } from "../api/auth-api";
import Contributors from "../database/models/CircleContributors";
import Permissions from "../database/models/CirclePermissions";
import EventApi from "../api/event-api";
import { Op } from "sequelize";
import Profile from "../database/models/Profile";
import InfluencerTarget from "../database/models/InfluencerTarget";
import InfluencerLink from "../database/models/InfluencerLink";
import Payment from "../database/models/Payment";
import assert from "assert";
import { checkUserPermsForEvent, EPERM } from "../api/permissions";
import {XOR} from "../api/event-api";
import { HTTPStatus } from "../utils";
dotenv.config();

export default class TicketRouter {
    router = express.Router();

    constructor() {
        this.initRoutes();
    }

    private initRoutes() {
        this.router.post("/ticket/new", this.createTicket.bind(this));
        this.router.post(
            "/ticket/mint",
            validateJWT,
            this.mintToken.bind(this)
        );
        this.router.get("/ticket/event/:eventId", this.getTickets.bind(this));
        this.router.get(
            "/ticket/wallet/:walletId",
            this.getUserTickets.bind(this)
        );
        this.router.post("/ticket/send", this.sendNFT.bind(this));
        this.router.post(
            "/ticket/withRoyalties",
            validateJWT,
            this.createTicketwithRoyalties.bind(this)
        );
        this.router.post(
            "/ticket/setPublic",
            validateJWT,
            this.setPublic.bind(this)
        );
        this.router.post(
            "/ticket/view/:ticketId",
            this.viewTicketArt.bind(this)
        );
        this.router.post("/ticket/accepted", this.chechAccept.bind(this));
        this.router.post(
            "/ticket/user/accepted",
            this.checkAcceptOfUserTickets.bind(this)
        );
        this.router.post(
            "/ticket/delete",
            validateJWT,
            this.deleteTicket.bind(this)
        );
        this.router.post(
            "/ticket/verify",
            validateJWT,
            this.verifyTicket.bind(this)
        );
        this.router.post(
            "/ticket/verify/check",
            validateJWT,
            this.verifyTicketCheck.bind(this)
        );
        this.router.get("/ticket/:ticketId", this.getAllTicketInfo.bind(this));
        // this.router.post('/ticket/:ticketId', validateJWT, this.editTicket.bind(this));
        this.router.post(
            "/ticket/user/delete",
            validateJWT,
            this.deleteUserTicket
        );
        this.router.post('/ticket/gift', this.giftTicket.bind(this), validateJWT);
    }

    private async deleteUserTicket(req: Request, res: Response) {
        try {
            const { ticketId, token } = req.body;

            if (!ticketId) {
                throw new CustomError({
                    status: 400,
                    message: "ticketId required",
                });
            }

            const userTicket = await NftBalance.findByPk(ticketId);

            if (!userTicket) {
                throw new CustomError({
                    status: 404,
                    message: `Ticket with id ${ticketId} not found`,
                });
            }

            if (token.verify.user.walletId != userTicket.walletId) {
                throw new CustomError({
                    status: 500,
                    message: "You have no permissions",
                });
            }

            await userTicket.destroy();

            res.status(200).json({
                message: "ok",
            });
        } catch (error) {
            res.status(error?.status || 500).json({ message: error.message });
        }
    }

    private async createTicket(req: Request, res: Response) {
        try {
            if (!req.is("json")) {
                throw new CustomError({
                    status: 400,
                    message: "Excepted Content-Type to be application/json",
                });
            }
            const avalanche = new AvalancheApi();
            const {
                ticket,
                userId,
                circleId,
            }: {
                ticket: any;
                userId: number | string;
                circleId: number;
            } = req.body;
            let user;

            const event = await EventModel.findByPk(ticket.EventModelId, {
                include: [
                    {
                        model: Circle,
                        include: [User],
                    },
                ],
            });

            // if (userId && (typeof userId === 'number' && userId !== event.organizer.id) || (typeof userId === 'string' && userId !== event.organizer.shortLink)
            //     || circleId && (typeof circleId === 'number' && circleId !== event.COrganizerId) || (typeof circleId === 'string' && circleId !== event.circle.shortLink)) {
            //     throw new CustomError({
            //         status: 403,
            //         message: 'You cannot do this operation'
            //     });
            // }

            if (ticket.banner && ticket.banner.length) {
                const bannerFile = new File();
                const savedFile = await bannerFile.uploadFile({
                    file: ticket.banner,
                    isTicketBanner: true,
                });

                if (!savedFile && !savedFile.filePath) {
                    throw new CustomError({
                        status: 500,
                        message: "Failed to save banner image as file.",
                    });
                }
                ticket.banner = savedFile.filePath || null;
            }

            if (userId) {
                user = await tryGetUser(userId, {
                    include: [
                        {
                            model: Wallet,
                        },
                    ],
                });
            } else if (circleId) {
                user = await Circle.findByPk(circleId, {
                    include: [Wallet, User],
                });
            }

            const { username, password } = await user.getWalletCredentials();

            const TicketAssetId: string = await this.createTickets(ticket, username, password, user.wallet.walletAddress);

            const newTicket = await Ticket.create({
                ...ticket,
                TicketAssetId,
                walletId: user.wallet.id,
                royalty: 0,
            });

            res.status(200).json({
                message: "Ticket was successfully created.",
            });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async createTickets(ticket, username: string, password: string, walletAddress: string) {
        const avalanche: AvalancheApi = new AvalancheApi();

        const balance = await avalanche.getAvaxBalance(
            walletAddress
        );
        const txfee = await avalanche.getTxFee();

        if (+balance < +txfee["creationTxFee"]) {
            const money = await avalanche.sendAvax(
                walletAddress,
                "creationTxFee"
            );
            const feeMoney = await avalanche.waitTx(money);

            if (feeMoney !== "Accepted") {
                throw new CustomError({
                    status: 500,
                    message: "Create tx not accepted",
                });
            }
        }

        const TicketAssetId = await avalanche.createNFT(
            username,
            password,
            walletAddress,
            // Allow only [a-zA-Z] or [SPACE] or [0-9]+
            // tempered greedy token: https://stackoverflow.com/a/37343088/1188377
            ticket.name, //ticket.name.replace(/(?:(?![a-zA-Z]+|\d+| ).)*/gm, ''),
            ticket.copies
        );

        const finalStatus = await avalanche.waitTx(TicketAssetId);

        if (finalStatus !== 'Accepted') {
            return await this.createTickets(ticket, username, password, walletAddress);
        }

        return TicketAssetId;
    }

    private async mintToken(req: Request, res: Response) {
        try {
            const {
                ticket,
                userId,
                influencerLink,
                service,
            }: {
                ticket: any;
                userId: number | string;
                influencerLink?: string | null;
                service?: string | null;
            } = req.body;
            let tickets: Ticket, user: User, influencerTarget: InfluencerTarget;

            if (!req.is("json")) {
                throw new CustomError({
                    status: 400,
                    message: "Excepted Content-Type to be application/json",
                });
            }

            user = await tryGetUser(userId, {
                include: [Wallet],
            });

            tickets = await Ticket.findByPk(ticket.id, {
                include: [
                    {
                        model: Wallet,
                        include: [User, Circle],
                    },
                    {
                        model: EventModel,
                        include: [
                            {
                                model: Circle,
                                include: [User, Wallet],
                            },
                            {
                                model: User,
                                include: [Wallet],
                            },
                        ],
                    },
                ],
            });

            if (!tickets) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found",
                });
            }
            const isJson = (value: any) => {
                try {
                    JSON.parse(value);
                } catch (e) {
                    return false;
                }
                return true;
            };

            const timezone: string = isJson(tickets.event.timezone)
                ? JSON.parse(<string>tickets.event.timezone).gmtOffset
                : tickets.event.timezone;
            const localTime: any = new Date(
                Number(tickets.event.endTime) -
                    Number(timezone.replace(/^GMT((?:\+|\-)\d+):\d+$/g, "$1")) *
                        3600 *
                        1000
            );
            console.log(localTime, new Date());
            if (tickets.event.endTime < new Date()) {
                throw new CustomError({
                    status: 400,
                    message:
                        "Oops! It seems this event already passed, you can only buy tickets to the upcoming events",
                });
            }

            if (tickets.copies < 1) {
                throw new CustomError({
                    status: 400,
                    message: "Sold out.",
                });
            }

            const avalanche = new AvalancheApi();
            let txId: string, feeTxTransfer: string;
            const minterBalance = await avalanche.getAvaxBalance(
                tickets.wallet.walletAddress
            );
            const txFee: string = await avalanche.getTxFee();

            if (+minterBalance < +txFee["txFee"]) {
                const money = await avalanche.sendAvax(
                    tickets.wallet.walletAddress,
                    "txFee"
                );
                const moneyFee = await avalanche.waitTx(money);

                if (moneyFee !== "Accepted") {
                    throw new CustomError({
                        status: 500,
                        message: "Fee tx not accepted",
                    });
                }
            }

            const day = new Date()
                .toISOString()
                .replace(
                    /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                    "$1.$2.$3 $4"
                );
            const startDate = tickets.event.startTime
                .toISOString()
                .replace(
                    /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                    "$1.$2.$3 $4"
                );
            const endDate = tickets.event.endTime
                .toISOString()
                .replace(
                    /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                    "$1.$2.$3 $4"
                );
            const payload = {
                avalanche: {
                    img: `https://api.flashback.one/${tickets.banner}`,
                    name: tickets.name,
                    creator: tickets.wallet.user
                        ? `User: ${tickets.wallet.user.fullName}`
                        : `Circle: ${tickets.wallet.circle.circleName}`,
                    mintDate: day,
                    eventStartDate: startDate,
                    eventEndDate: endDate,
                    price: tickets.price,
                    currency: tickets.currency,
                    count: `${Number(tickets.minted) + 1}/${
                        Number(tickets.minted) + Number(tickets.copies)
                    }`,
                    features: tickets.features,
                    description: tickets.description,
                },
            };

            if (tickets.TicketAssetId.startsWith("0x")) {
                let walletOwner: IWalletOwner =
                    tickets.event.organizer || tickets.event.circle;
                const avaWallet = walletOwner.wallet;
                if (!avaWallet) {
                    throw new CustomError({
                        status: 500,
                        message: "No wallet, cant mint",
                    });
                }
                const { username, password } =
                    await walletOwner.getWalletCredentials();

                if (!avaWallet.cChainAddress) {
                    walletOwner = await this.createCChainAddress(walletOwner);
                }

                const userPkey = await avalanche.cChainExportKey(
                    username,
                    password,
                    avaWallet.cChainAddress
                );

                const keyHex = avalanche.bintools.cb58Decode(
                    userPkey.split("-")[1]
                );
                const wallet = new ethers.Wallet(keyHex, ethers.provider);
                const token = (await ethers.getContractAt(
                    "MinimalERC721",
                    tickets.TicketAssetId,
                    wallet
                )) as MinimalERC721;
                if (!user.wallet.cChainAddress) {
                    user = await this.createCChainAddress(user);
                }

                const tx = await token.mint(user.wallet.cChainAddress);
                txId = tx.hash;
                await tx.wait();
                const own = await token.ownsId(wallet.address);
                await token.setRoyalties(
                    own.tokenId,
                    user.wallet.cChainAddress,
                    Number(tickets.royalty) * 100
                );
            } else {
                let walletOwner: IWalletOwner =
                    tickets.event.organizer || tickets.event.circle;
                let { username, password } =
                    await walletOwner.getWalletCredentials();

                const mint = await avalanche.mintNFT(
                    username,
                    password,
                    tickets.wallet.walletAddress,
                    tickets.TicketAssetId,
                    tickets.TicketAssetId,
                    user.wallet.walletAddress,
                    payload,
                    tickets.copies
                );
                const finalStatus = await avalanche.waitTx(mint);

                if (finalStatus !== "Accepted") {
                    throw new CustomError({
                        status: 500,
                        message: "Mint tx not accepted",
                    });
                }

                txId = mint;
            }
            await NftBalance.create({
                walletId: user.wallet.id,
                tokenId: tickets.id,
                txid: txId,
                isPublic: !!user.FlashBsPrivate,
                groupId: tickets.copies - 1,
                verified: false,
                verifiedAt: null,
                reVerified: false,
                reVerifiedAt: null,
                verifyOwnerId: null,
            });

            await tickets.decrement("copies");
            await tickets.increment("minted");

            if (influencerLink) {
                influencerTarget = await InfluencerTarget.findOne({
                    where: {
                        eventId: tickets.EventModelId,
                        "$influencerLink.link$": {
                            [Op.iLike]: influencerLink,
                        },
                    },
                    include: [
                        {
                            model: InfluencerLink,
                            as: "influencerLink",
                        },
                        EventModel,
                    ],
                });
            }
            if (tickets.price > 0) {
                await Payment.create({
                    walletId: user.walletId,
                    ticketId: tickets.id,
                    influencerTargetId: influencerTarget?.id || undefined,
                    service: service || undefined,
                });
            }

            res.status(200).json({ message: "Ticket was minted" });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async sendNFT(req: Request, res: Response) {
        try {
            const {
                userToId,
                ticketId,
                emailTo,
            }: {
                userToId: number | string;
                ticketId: number;
                emailTo?: string;
            } = req.body;
            const mail = new Mail();
            let userTo: User, randomPassword;

            if ((!userToId || !emailTo) && !ticketId) {
                throw new CustomError({
                    status: 400,
                    message:
                        '"ticketId", "eventId" and "userToId" (or "emailTo", if user is not registered) parameters are required',
                });
            }

            const ticket = await NftBalance.findByPk(ticketId, {
                include: [
                    {
                        model: Wallet,
                        include: [User],
                    },
                    {
                        model: Ticket,
                        include: [EventModel, Wallet],
                        paranoid: false,
                    },
                ],
            });

            const avalanche = new AvalancheApi();

            let userFound, sendTx, feeTxStatus, transfer;
            if (emailTo) {
                userFound = await User.findOne({
                    where: {
                        email: {
                            [Op.iLike]: `%${emailTo}%`,
                        },
                    },
                    include: [Wallet],
                });

                if (!userFound) {
                    const randInt = (start, end) =>
                        Math.floor(start + Math.random() * (end - start));
                    const char = (x) => String.fromCharCode(x);
                    randomPassword =
                        crypto.randomBytes(10).toString("hex") +
                        "@" +
                        char(randInt(35, 38));
                    const passwordHash = await bcrypt.hash(
                        randomPassword,
                        Number(process.env.SALT_ROUNDS) || 10
                    );
                    userTo = await User.create({
                        fullName: "Name Surname",
                        email: emailTo,
                        password: passwordHash,
                    });
                    const username: string = avalanche.bintools.cb58Encode(
                        Buffer.from(
                            await bcrypt.hash(
                                emailTo,
                                Number(process.env.SALT_ROUNDS)
                            )
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

                    await userTo.update({
                        walletId: wallet.id,
                    });

                    userTo.wallet = await userTo.getWallet();
                } else {
                    userTo = userFound;
                }
            }

            if (userToId) {
                userTo = await tryGetUser(userToId, {
                    include: [
                        {
                            model: Wallet,
                        },
                    ],
                });
            }

            if (!userTo) {
                throw new CustomError({
                    status: 404,
                    message: "User does not exist",
                });
            }

            if (!userTo.wallet) {
                throw new CustomError({
                    status: 400,
                    message: "User does not have a wallet, can't transfer",
                });
            }

            const balance = await avalanche.getAvaxBalance(
                ticket.wallet.walletAddress
            );
            const txFee = await avalanche.getTxFee();

            if (+balance < +txFee["txFee"]) {
                const money = await avalanche.sendAvax(
                    ticket.wallet.walletAddress,
                    "txFee"
                );
                const feeMoney = await avalanche.waitTx(money);

                if (feeMoney !== "Accepted") {
                    throw new CustomError({
                        status: 500,
                        message: "Fee tx not accepted",
                    });
                }
            }

            if (ticket.tickets.TicketAssetId.startsWith("0x")) {
                const userPkey = await avalanche.cChainExportKey(
                    ticket.wallet.user.email,
                    ticket.wallet.user.password,
                    ticket.wallet.cChainAddress
                );
                const keyHex = avalanche.bintools.cb58Decode(
                    userPkey.split("-")[1]
                );
                const wallet = new ethers.Wallet(keyHex, ethers.provider);
                const token = (await ethers.getContractAt(
                    "MinimalERC721",
                    ticket.tickets.TicketAssetId,
                    wallet
                )) as MinimalERC721;
                const own = await token.ownsId(wallet.address);
                if (!own.owns) {
                    throw new CustomError({
                        status: 500,
                        message: "User does not have that token",
                    });
                }
                if (!userTo.wallet.cChainAddress) {
                    userTo = await this.createCChainAddress(userTo);
                }
                await token.transferFrom(
                    ticket.wallet.cChainAddress,
                    userTo.wallet.cChainAddress,
                    own.tokenId
                );
            } else {
                sendTx = await avalanche.sendNFT(
                    ticket.wallet.username,
                    ticket.wallet.user.password,
                    ticket.wallet.walletAddress,
                    userTo.wallet.walletAddress,
                    ticket.tickets.TicketAssetId,
                    ticket.txid
                );
            }

            const sender = ticket.wallet;

            await ticket.update({
                walletId: userTo.wallet.id,
                txid: sendTx,
            });

            if (userToId || userFound) {
                await mail.TransferToRegisteredUserMail({
                    email: userTo.email,
                    senderName: sender.user.fullName,
                    eventName: ticket.tickets.event.name,
                    receiverName: userTo.fullName,
                    ticketLink: `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/users/${userTo.shortLink || userTo.id}`,
                    ticket
                });
            } else if (emailTo && !userFound) {
                await mail.TransferToUnregisteredUserMail({
                    email: emailTo,
                    senderName: sender.user.fullName,
                    eventName: ticket.tickets.event.name,
                    password: randomPassword,
                    ticket
                });
            }

            res.status(200).json({ message: "Ticket was successfully send." });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async recursiveMint(
        username: string,
        password: string, 
        walletAddress: string, 
        ticket: Ticket
    ): Promise<any> {
        const avalanche: AvalancheApi = new AvalancheApi();

        const balance = await avalanche.getAvaxBalance(
            ticket.wallet.walletAddress
        );
        const txfee = await avalanche.getTxFee();

        if ((+balance) < (+txfee["txFee"])) {
            const money = await avalanche.sendAvax(
                ticket.wallet.walletAddress,
                "txFee"
            );
            const feeMoney = await avalanche.waitTx(money);

            if (feeMoney !== "Accepted") {
                throw new CustomError({
                    status: 500,
                    message: "Create tx not accepted",
                });
            }
        }

        const day = new Date()
                .toISOString()
                .replace(
                    /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                    "$1.$2.$3 $4"
                );
        const startDate = ticket.event.startTime
            .toISOString()
            .replace(
                /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                "$1.$2.$3 $4"
            );
        const endDate = ticket.event.endTime
            .toISOString()
            .replace(
                /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
                "$1.$2.$3 $4"
            );
        const payload = {
            avalanche: {
                img: `https://api.flashback.one/${ticket.banner}`,
                name: ticket.name,
                creator: ticket.wallet.user
                    ? `User: ${ticket.wallet.user.fullName}`
                    : `Circle: ${ticket.wallet.circle.circleName}`,
                mintDate: day,
                eventStartDate: startDate,
                eventEndDate: endDate,
                price: ticket.price,
                currency: ticket.currency,
                count: `${Number(ticket.minted) + 1}/${
                    Number(ticket.minted) + Number(ticket.copies)
                }`,
                features: ticket.features,
                description: ticket.description,
            },
        };

        const txid = await avalanche.mintNFT(
            username,
            password,
            ticket.wallet.walletAddress,
            // Allow only [a-zA-Z] or [SPACE] or [0-9]+
            // tempered greedy token: https://stackoverflow.com/a/37343088/1188377
            ticket.TicketAssetId, //ticket.name.replace(/(?:(?![a-zA-Z]+|\d+| ).)*/gm, ''),
            ticket.TicketAssetId,
            walletAddress,
            payload,
            ticket.copies
        );

        const finalStatus = await avalanche.waitTx(txid);

        if (finalStatus !== 'Accepted') {
            return await this.recursiveMint(username, password, walletAddress, ticket);
        }

        return txid;
    }

    private async getTickets(req: Request, res: Response) {
        try {
            const eventId: any = req.params.eventId;
            const event: EventModel = await tryGetEvent(eventId);

            if (!eventId) {
                throw new CustomError({
                    status: 400,
                    message: "Param is required",
                });
            }

            const tickets = await Ticket.findAll({
                where: {
                    EventModelId: event.id,
                },
                include: [
                    {
                        model: EventModel,
                        paranoid: false,
                    },
                ],
                order: [["createdAt", "ASC"]],
            });

            res.status(200).json({ message: tickets });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async getUserTickets(req: Request, res: Response) {
        try {
            const walletId: number = Number(req.params.walletId);
            const tickets = await NftBalance.findAll({
                where: {
                    walletId: walletId,
                },
                include: [
                    {
                        model: Ticket,
                        include: [
                            {
                                model: EventModel,
                                paranoid: false,
                            },
                        ],
                        paranoid: false,
                    },
                ],
            });

            if (!tickets) {
                throw new CustomError({
                    status: 400,
                    message: "Params are required",
                });
            }

            res.status(200).json({
                message: tickets,
            });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async createCChainAddress<T extends IWalletOwner>(walletOwner: T) {
        const ava = new AvalancheApi();
        const { username, password } = await walletOwner.getWalletCredentials();
        const key = await ava.xChainExportKey(
            username,
            password,
            walletOwner.wallet.walletAddress
        );
        const addr = await ava.cChainImportKey(username, password, key);

        await walletOwner.wallet.update({
            cChainAddress: addr,
        });
        walletOwner.wallet.cChainAddress = addr;
        return walletOwner;
    }

    private async verifyTicket(req: Request, res: Response) {
        try {
            const {
                ticketId,
                token,
            }: {
                ticketId: string;
                token: ValidateJWTResponse;
            } = req.body;

            if (!ticketId) {
                throw new CustomError({
                    status: 400,
                    message: "ticketId is requierd",
                });
            }

            const nftbalance = await NftBalance.findOne({
                where: {
                    txid: {
                        [Op.iLike]: ticketId,
                    },
                },
                include: [
                    {
                        model: Ticket,
                        include: [
                            {
                                model: EventModel,
                                paranoid: false,
                            },
                        ],
                        paranoid: false,
                    },
                ],
            });

            if (!nftbalance) {
                throw new CustomError({
                    status: 404,
                    message: "No such ticket",
                });
            }
            assert(nftbalance.tickets, "Ticket family was deleted");
            assert(nftbalance.tickets.event, "No event for ticket");
            await checkUserPermsForEvent(
                nftbalance.tickets.event,
                token.verify.user,
                EPERM.TICKET_CTRL
            );

            if (nftbalance.verified) {
                assert(!nftbalance.reVerified, "This ticket has already been double verified")
                await nftbalance.update({
                    reVerified: true,
                    reVerifiedAt: new Date(),
                });
            } else {
                await nftbalance.update({
                    verified: true,
                    verifiedAt: new Date(),
                    verifyOwnerId: token.verify.user.id,
                });
            }

            res.status(200).json({
                message: "ok!",
            });
        } catch (e) {
            console.log(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async verifyTicketCheck(req: Request, res: Response) {
        try {
            const {
                ticketId,
                token,
            }: {
                ticketId: string;
                token: ValidateJWTResponse;
            } = req.body;

            const eventAPI = new EventApi();

            if (!ticketId) {
                throw new CustomError({
                    status: 400,
                    message: "ticketId is required",
                });
            }

            const nftbalance = await NftBalance.findOne({
                where: {
                    txid: {
                        [Op.iLike]: ticketId,
                    },
                },
                include: [
                    {
                        model: Ticket,
                        include: [
                            {
                                model: EventModel,
                                paranoid: false,
                            },
                        ],
                        paranoid: false,
                    },
                ],
            });

            if (!nftbalance) {
                throw new CustomError({
                    status: 404,
                    message: "No such ticket",
                });
            }

            assert(nftbalance.tickets, "Ticket faimily was deleted");
            assert(nftbalance.tickets.event, "No event for ticket");
            assert(!nftbalance.reVerified, "This ticket has already been double verified")
            await checkUserPermsForEvent(
                nftbalance.tickets.event,
                token.verify.user,
                EPERM.TICKET_CTRL
            );

            res.status(200).send({ allowed: true });
        } catch (e) {
            console.log(e);
            res.status(200).send({ allowed: false, message: e.message });
        }
    }

    private async createTicketwithRoyalties(req: Request, res: Response) {
        try {
            if (!req.is("json")) {
                throw new CustomError({
                    status: 400,
                    message: "Excepted Content-Type to be application/json",
                });
            }
            const avalanche = new AvalancheApi();

            const {
                ticket,
                userId,
                circleId,
            }: {
                ticket: any;
                userId: number | string;
                circleId: number;
            } = req.body;
            let user: User | Circle;

            if (!ticket.royalty || !(ticket.royalty > 0)) {
                throw new CustomError({
                    status: 400,
                    message:
                        "Creating ticket with royalty, but royalty not provided",
                });
            }

            if (ticket.banner && ticket.banner.length) {
                const bannerFile = new File();
                const savedFile = await bannerFile.uploadFile({
                    file: ticket.banner,
                    isTicketBanner: true,
                });

                if (!savedFile && !savedFile.filePath) {
                    throw new CustomError({
                        status: 500,
                        message: "Failed to save banner image as file.",
                    });
                }
                ticket.banner = savedFile.filePath || null;
            }

            if (userId) {
                user = await tryGetUser(userId, {
                    include: [
                        {
                            model: Wallet,
                        },
                    ],
                });
            } else if (circleId) {
                user = await Circle.findByPk(circleId, {
                    include: [Wallet, User],
                });
            }

            if (!user.wallet.cChainAddress) {
                user = await this.createCChainAddress(user);
                console.log("user cChainAddrCreate");
            }

            //const [signer] = await  ethers.getSigners();
            const contractFactory = (await ethers.getContractFactory(
                "MinimalERC721"
            )) as MinimalERC721__factory;
            const newTicket = await Ticket.create({
                ...ticket,
                TicketAssetId: "0x0",
                walletId: user.wallet.id,
            });

            const contract = await contractFactory.deploy(
                newTicket.id.toString(),
                ticket.copies
            );
            await contract.deployed();
            await contract.transferOwnership(user.wallet.cChainAddress);

            const nt = await newTicket.update({
                TicketAssetId: contract.address,
            });
            res.status(200).json({ message: "Created ticket", ticket: nt });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }
    private async viewTicketArt(req: Request, res: Response) {
        try {
            const ticketId: number = Number(req.params.ticketId);

            if (!ticketId) {
                throw new CustomError({
                    status: 400,
                    message: "Param is required",
                });
            }

            const ticket = await Ticket.findByPk(ticketId);

            if (!ticket) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found",
                });
            }
            res.redirect(`https://flashback-general.one/${ticket.banner}`);
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async setPublic(req: Request, res: Response) {
        try {
            const ticketId: number = Number(req.body.ticketId);
            const token: ValidateJWTResponse = req.body.token;
            const isPublic: boolean = req.body.public;

            if (!ticketId) {
                throw new CustomError({
                    status: 400,
                    message: "Param is required",
                });
            }

            const ticket = await NftBalance.findByPk(ticketId, {
                include: [
                    {
                        model: Wallet,
                        include: [
                            {
                                model: User,
                            },
                        ],
                    },
                ],
            });

            if (!ticket) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found",
                });
            }

            if (ticket.wallet.user.id !== token.verify.user.id) {
                throw new CustomError({
                    status: 403,
                    message: "Access denied",
                });
            }
            await ticket.update({
                isPublic,
            });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async chechAccept(req: Request, res: Response) {
        try {
            const eventId: any = req.body.eventId;
            const avalanche = new AvalancheApi();
            const event: EventModel = await tryGetEvent(eventId)
            const tickets: Ticket[] = await Ticket.findAll({
                where: {
                    EventModelId: event.id,
                },
            });
            if (!tickets) {
                throw new CustomError({
                    status: 404,
                    message: "No tickets found",
                });
            }

            let result: Array<any> = await Promise.all(
                tickets.map(async (el) => ({
                    id: el.id,
                    accepted: await avalanche.checkAccept(el.TicketAssetId),
                }))
            );
            res.status(200).json({ result: result });
        } catch (e) {
            console.log(e);
            res.status(500 || e.status).json({ message: e.message });
        }
    }

    public async checkAcceptOfUserTickets(req: Request, res: Response) {
        try {
            const walletId: any = req.body.walletId;
            const avalanche = new AvalancheApi();
            const tickets: NftBalance[] = await NftBalance.findAll({
                where: {
                    walletId: walletId,
                },
            });

            if (!tickets) {
                throw new CustomError({
                    status: 404,
                    message: "No tickets found",
                });
            }

            let result: Array<any> = await Promise.all(
                tickets.map(async (el) => ({
                    id: el.id,
                    accepted: await avalanche.checkAccept(el.txid),
                }))
            );
            res.status(200).json({ result: result });
        } catch (e) {
            console.log(e);
            res.status(500 || e.status).json({ message: e.message });
        }
    }

    private async getAllTicketInfo(req: Request, res: Response) {
        try {
            const {
                token,
            }: {
                token: ValidateJWTResponse;
            } = req.body;

            if (!req.params.ticketId) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket id required.",
                });
            }

            const ticketId = req.params.ticketId.toString();

            // const ticket = await NftBalance.findByPk(ticketId, {
            //     include: [{
            //         model: Ticket,
            //         include: [{
            //             model: EventModel,
            //             include: [User, Circle]
            //         }]
            //     }]
            // });

            const ticket = await NftBalance.findOne({
                where: {
                    txid: {
                        [Op.iLike]: ticketId,
                    },
                },
                include: [
                    {
                        model: Ticket,
                        include: [
                            {
                                model: EventModel,
                                paranoid: false,
                            },
                        ],
                        paranoid: false,
                    },
                    {
                        model: Wallet,
                        include: [
                            {
                                model: User,
                                attributes: {
                                    exclude: [
                                        "password",
                                        "FlashBsPrivate",
                                        "can_royalty",
                                        "crypto_summ",
                                        "deletedAt",
                                        "fiat_summ",
                                        "newsLetter",
                                        "verificationId",
                                        "walletId",
                                    ],
                                },
                                include: [
                                    {
                                        model: Profile,
                                        attributes: ["avatar"],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            if (!ticket) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found",
                });
            }

            const { user } = ticket.wallet;

            res.status(200).json({
                ticketInfo: {
                    ticket: ticket,
                    user: user,
                },
            });

        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    private async giftTicket(req: Request, res: Response) {
        try {
            const {userId, email, token, ticketId}: {
                userId: number | string | undefined,
                email: string | undefined,
                token: ValidateJWTResponse,
                ticketId: number
            } = req.body;
            let newUser: boolean = false, randomPassword: string = '';
            const avalanche: AvalancheApi = new AvalancheApi();

            appAssert(XOR(userId, email), "User ID and email cannot be supplied at the same time.");

            const options = {
                include: [Wallet]   
            };

            let user: User = (!!userId) ? await tryGetUser(userId, options) : await User.findOne({
                where: {
                    email
                },
                ...options
            });

            if (!user) {
                newUser = true;
                const randInt = (start, end) =>
                    Math.floor(start + Math.random() * (end - start));
                const char = (x) => String.fromCharCode(x);
                randomPassword =
                    crypto.randomBytes(10).toString("hex") +
                    "@" +
                    char(randInt(35, 38));
                const passwordHash = await bcrypt.hash(
                    randomPassword,
                    Number(process.env.SALT_ROUNDS) || 10
                );
                user = await User.create({
                    fullName: "Name Surname",
                    email: email.toLowerCase().trim(),
                    password: passwordHash,
                });
                const username: string = avalanche.bintools.cb58Encode(
                    Buffer.from(
                        await bcrypt.hash(
                            email.toLowerCase().trim(),
                            Number(process.env.SALT_ROUNDS)
                        )
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

                await user.update({
                    walletId: wallet.id,
                });
            }
            
            const ticket: Ticket = await Ticket.findOne({
                where: {
                    id: ticketId
                },
                include: [{
                    model: EventModel,
                    include: [Circle, User]
                }]
            });

            appAssert(
                token.verify.user.id != (ticket.event.organizerId || ticket.event.COrganizerId), 
                "You cannot do this operation because you are not an owner.", 
                HTTPStatus.FROBIDDEN
            );

            if (!ticket) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found"
                });
            }

            const ticketOwner: IWalletOwner = ticket.event.circle || ticket.event.organizer;
            const {username, password} = await ticketOwner.getWalletCredentials();

            const txid = await this.recursiveMint(username, password, user.wallet.walletAddress, ticket);

            const nftBalance = await NftBalance.create({
                walletId: user.wallet.id,
                tokenId: ticket.id,
                txid,
                isPublic: !!user.FlashBsPrivate,
                groupId: ticket.copies - 1,
                verified: false,
                verifiedAt: null,
                reVerified: false,
                reVerifiedAt: null,
                verifyOwnerId: null,
            }, {
                include: [
                    {
                        model: Wallet,
                        include: [User],
                    },
                    {
                        model: Ticket,
                        include: [EventModel, Wallet],
                        paranoid: false,
                    },
                ]
            });

            if (!newUser) {
                await (new Mail()).TransferToRegisteredUserMail({
                    email: email.toLowerCase().trim(),
                    senderName: ticket.event.organizer.fullName || ticket.event.circle.circleName,
                    eventName: ticket.event.name,
                    receiverName: user.fullName,
                    ticketLink: `${process.env.SITE_PROTOCOL}://${process.env.SITE_DOMAIN}/users/${user.shortLink || user.id}`,
                    ticket: nftBalance
                });
            } else {
                await (new Mail()).TransferToUnregisteredUserMail({
                    email: email.toLowerCase().trim(),
                    senderName: ticket.event.organizer.fullName || ticket.event.circle.circleName,
                    eventName: ticket.event.name,
                    password: randomPassword,
                    ticket: nftBalance
                });
            }

            res.status(200).json({ message: 'Ticket was successfully sent.' });
        } catch (e) {
            console.log(e);
            res.status(500 || e.status).json({ message: e.message });
        }
        
    }

    private async deleteTicket(req: Request, res: Response) {
        try {
            const {
                ticketId,
                token,
            }: {
                ticketId: number;
                token: ValidateJWTResponse;
            } = req.body;

            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: EventModel,
                        include: [Circle],
                    },
                ],
            });

            const user: User = await tryGetUser(token.verify.user.id);

            if (!ticket) {
                throw new CustomError({
                    status: 404,
                    message: "Ticket not found",
                });
            }


            await checkUserPermsForEvent(
                ticket.event,
                token.verify.user,
                EPERM.ADMIN
            );

            await ticket.destroy();

            res.status(200).json({
                message: "Ok",
            });
        } catch (e) {
            console.error(e);
            res.status(e.status || 500).json({ message: e.message });
        }
    }

    // private async editTicket(req: Request, res: Response) {
    //     try {
    //         const ticket = await Ticket.findByPk(Number(req.params.ticketId));
    //
    //         if (!ticket) {
    //             throw new CustomError({
    //                 status: 404,
    //                 message: 'Ticket not found'
    //             });
    //         }
    //     } catch (e) {
    //         console.log(e);
    //         res.status(e.status || 500).json({ message: e.message } );
    //     }
    // }

    private isOwner(
        ticket: Ticket,
        userId?: number | string | null,
        circleId?: number | string | null
    ): boolean {
        return circleId
            ? ticket.event.COrganizerId == circleId
            : ticket.event.organizerId == userId;
    }

    private async checkPerms(user: User, circle: Circle, perms: EPERM) {
        const initiatorPerms = await Contributors.findOne({
            where: {
                userId: user.id,
                circleId: circle.id,
            },
            include: [Permissions],
        });

        const permClearance = initiatorPerms && initiatorPerms.id <= perms;

        if (circle.organizerId !== user.id && permClearance) {
            return false;
        }
        return true;
    }
}
