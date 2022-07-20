import sequelize from "./sequelize";
import User from "./models/User";
import NftBalance from "./models/NftBalance";
import Circle from "./models/Circle";
import Ticket from "./models/Ticket";
import Wallet from "./models/Wallet";
import EventModel from "./models/Events";
import {Dialect, Op} from "sequelize";
import {Sequelize} from "sequelize-typescript";
import {CircleEventType} from "./models/CircleEventType";
import CircleEventInterval from "./models/CircleEventInterval";
import AvalancheApi from "../avalanche/avalanche-api";
import {BN, Buffer} from 'avalanche';
import Profile from "./models/Profile";
import Interest from "./models/Interest";
import Verification from "./models/Verification";
import * as crypto from "crypto";
import CustomError from "../CustomError";
import {IWalletOwner} from "./InterfaceDefenitions";
import bcrypt from 'bcrypt';
// import xlsx from 'node-xlsx';
import {tryGetUser} from "../api/commom";
import Mail from "../api/mail";
// import { sendEmail } from "./HtmlGeneration";
// import Order from "./models/Order";
import dotenv = require('dotenv');
import {getAvalanche} from "avalanche/typings/e2e_tests/e2etestlib";
const mailchimp = require('@mailchimp/mailchimp_transactional')(
    process.env.MAILCHIMP_API
);
import fs = require('fs');
import { updateAsExpression } from "typescript";
dotenv.config();

// const main = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             EventModelId: (await EventModel.findOne({
//                 where: {
//                     name: 'ComeOnOver Tour 2021'
//                 }
//             })).id
//         },
//         include: [{
//             model: NftBalance,
//             include: [{
//                 model: Wallet,
//                 include: [User]
//             }]
//         }],
//         order: [['createdAt', 'ASC']],
//     });
//     await migrateNftBalances(tickets);
//     // await recreateTickets();
// }

// const recreateTickets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             id: {
//                 [Op.in]: [23]
//             }
//         },
//         include: [{
//             model: Wallet,
//             include: [{
//                 model: Circle,
//                 include: [User, Wallet]
//             }]
//         }]
//     });
//     tickets.map((ticket: Ticket, i: number) => {
//         setTimeout(async () => {
//             const avaxTransfer: string = await avalanche.sendAvax(ticket.wallet.walletAddress, 'creationTxFee');
//             const avaxStatus: string = await avalanche.waitTx(avaxTransfer);
//             const walletOwner: IWalletOwner = ticket.wallet.circle;
//             const {username, password} = await walletOwner.getWalletCredentials();
//             if (avaxStatus !== 'Accepted') {
//                 throw new CustomError({
//                     status: 500,
//                     message: 'Transaction is not accepted'
//                 });
//             }
//             const createNft: string = await avalanche.createNFT(
//                 username,
//                 password,
//                 ticket.wallet.walletAddress,
//                 ticket.name,
//                 (Number(ticket.copies) + Number(ticket.minted))
//             );
//             const createStatus: string = await avalanche.waitTx(createNft);
//             if (createStatus !== 'Accepted') {
//                 throw new CustomError({
//                     status: 500,
//                     message: 'Transaction is not accepted'
//                 });
//             }
//             await ticket.update({
//                 TicketAssetId: createNft,
//                 copies: (Number(ticket.copies) + Number(ticket.minted)),
//                 minted: 0
//             });
//             console.log(`Done ${i}\n`)
//         }, i * 8000);
//     });
// }

// const migrateNftBalances = async (
//     testTickets: Ticket[]
// ) => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     let countTickets: number = testTickets.map((ticket: Ticket) => ticket.balances.length).reduce((x, y) => x + y);
//     let count: number = 0, index: number = 7;
//     const avalanche: AvalancheApi = new AvalancheApi();
//     testTickets[index].balances.map(async (testBalance: NftBalance, j: number) => {
//         setTimeout(async () => {
//             const prodTicket: Ticket = await Ticket.findOne({
//                 where: {
//                     name: testTickets[index].name
//                 },
//                 include: [{
//                     model: Wallet,
//                     include: [{
//                         model: Circle,
//                         include: [User, Wallet]
//                     }]
//                 }, EventModel]
//             });
//             const owner: User = await User.findOne({
//                 where: {
//                     email: testBalance.wallet.user.email,
//                     // walletId: {
//                     //     [Op.notIn]: [734, 737]
//                     // }
//                 },
//                 include: [Wallet]
//             });
//             if (owner && owner.walletId == null) {
//                 const username: string = avalanche.bintools.cb58Encode(
//                     Buffer.from(await bcrypt.hash(owner.email, 10))
//                 )
//                 await avalanche.createUser(username, owner.password);
//                 const {xChain, cChain} = await avalanche.createAddress(username, owner.password);
//                 const wallet: Wallet = await Wallet.create({
//                     walletAddress: xChain,
//                     cChainAddress: cChain,
//                     username: username
//                 });
//                 await owner.update({
//                     walletId: wallet.id
//                 });
//             }
//             if (owner) {
//                 const ticketOwner: IWalletOwner = prodTicket.wallet.circle;
//                 const {username, password} = await ticketOwner.getWalletCredentials();
//                 const payload: any = await payloadObject(
//                     new Date(),
//                     prodTicket.event.startTime,
//                     prodTicket.event.endTime,
//                     prodTicket.banner,
//                     prodTicket.name,
//                     prodTicket.wallet.circle,
//                     prodTicket.price,
//                     prodTicket.currency,
//                     prodTicket.minted,
//                     prodTicket.copies,
//                     prodTicket.features,
//                     prodTicket.description
//                 );
//                 const balance: any = await avalanche.getAvaxBalance(prodTicket.wallet.walletAddress);
//                 const txFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+txFee['txFee'])) {
//                     const avaxTransfer: string = await avalanche.sendAvax(
//                         prodTicket.wallet.walletAddress,
//                         'txFee'
//                     );
//                     const avaxTransferStatus: string = await avalanche.waitTx(avaxTransfer);
//                     if (avaxTransferStatus !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Transaction is not accepted'
//                         });
//                     }
//                 }
//                 const mintTx: string = await avalanche.mintNFT(
//                     username,
//                     password,
//                     prodTicket.wallet.walletAddress,
//                     prodTicket.TicketAssetId,
//                     prodTicket.TicketAssetId,
//                     owner.wallet.walletAddress,
//                     payload,
//                     prodTicket.minted
//                 );
//                 const mintTxStatus: string = await avalanche.waitTx(mintTx);
//                 if (mintTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 const avaxTransfer2: string = await avalanche.sendAvax(prodTicket.wallet.walletAddress, 'txFee');
//                 const avaxTransfer2Status: string = await avalanche.waitTx(avaxTransfer2);
//                 if (avaxTransfer2Status !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 const sendTx: string = await avalanche.sendNFT(
//                     username,
//                     password,
//                     prodTicket.wallet.walletAddress,
//                     owner.wallet.walletAddress,
//                     prodTicket.TicketAssetId,
//                     mintTx
//                 );
//                 const sendTxStatus: string = await avalanche.waitTx(sendTx);
//                 if (sendTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 await NftBalance.create({
//                     walletId: owner.walletId,
//                     tokenId: prodTicket.id,
//                     txid: sendTx,
//                     isPublic: !!owner.FlashBsPrivate,
//                     groupId: prodTicket.minted
//                 });
//                 await prodTicket.decrement('copies');
//                 await prodTicket.increment('minted');
//                 console.log(`\n-------- Ticket creator --------\n--- Username: ${username} ---\n--- Password: ${password} ---`)
//                 console.log(`\n--- Ticket Name: ${prodTicket.name} ---\n--- Owner: ${owner.email} ---\n--- Number: ${count += 1}`);
//             } else {
//                 console.log(`\nOwner already has ticket!`);
//             }
//         }, j * 12000);
//     });
//     testTickets.map(async (testTicket: Ticket, i: number) => {
//         setTimeout(async () => {
//             const prodTicket: Ticket = await Ticket.findOne({
//                 where: {
//                     name: testTicket.name
//                 },
//                 include: [{
//                     model: Wallet,
//                     include: [{
//                         model: Circle,
//                         include: [User, Wallet]
//                     }]
//                 }]
//             });
//             console.log(`--- ${testTicket.balances.length} ---`)
//             testTicket.balances.map(async (testBalance: NftBalance, j: number) => {
//                 setTimeout(async () => {
//                     const owner: User = await User.findOne({
//                         where: {
//                             email: testBalance.wallet.user.email
//                         },
//                         include: [Wallet]
//                     });
//                     const ticketOwner: IWalletOwner = prodTicket.wallet.circle;
//                     const {username, password} = await ticketOwner.getWalletCredentials();
//                     console.log(`\n-------- Ticket creator --------\n--- Username: ${username} ---\n--- Password: ${password} ---`)
//                     // const mintTx: string = await avalanche.mintNFT()
//                     console.log(`\n--- Ticket Name: ${prodTicket.name} ---\n--- Owner: ${owner.email} ---\n--- Number: ${count += 1}`);
//                 }, j * 2000);
//             });
//         }, i * (testTicket.balances.length) * 4000);
//     });
// }

// const migrateTickets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             EventModelId: (await EventModel.findOne({
//                 where: {
//                     name: 'ComeOnOver Tour 2021'
//                 }
//             })).id
//         },
//         order: [
//             ['id', 'ASC']
//         ],
//         include: [{
//             model: Wallet,
//             include: [{
//                 model: Circle,
//                 include: [User]
//             }]
//         }]
//     });
//     tickets.map((ticket: Ticket, i: number) => {
//         setTimeout(async () => {
//             const ticketTxStatus: string = await avalanche.checkAccept(ticket.TicketAssetId);
//             if (ticketTxStatus !== 'Accepted') {
//                 const balance: any = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//                 const creationTxFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+creationTxFee['creationTxFee'])) {
//                     const sendAvax: string = await avalanche.sendAvax(ticket.wallet.walletAddress, 'creationTxFee');
//                     const avaxTransferTxStatus: string = await avalanche.waitTx(sendAvax);
//                     if (avaxTransferTxStatus !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Tx is not accepted.'
//                         });
//                     }
//                 }
//                 const ticketTx: string = await avalanche.createNFT(
//                     ticket.wallet.username,
//                     avalanche.bintools.cb58Encode(
//                         Buffer.from(ticket.wallet.circle.organizer.password)
//                     ),
//                     ticket.wallet.walletAddress,
//                     ticket.name,
//                     ticket.copies
//                 );
//                 const creationTxStatus: string = await avalanche.waitTx(ticketTx);
//                 if (creationTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Creation Tx is not accepted'
//                     });
//                 }
//                 await ticket.update({
//                     TicketAssetId: ticketTx
//                 });
//                 console.log(`------- Ticket: ${ticket.name} -------\n--- Circle: ${ticket.wallet.circle.circleName} ---\n--- Circle Organizer: ${ticket.wallet.circle.organizer.email} ---\n--- Wallet Address: ${ticket.wallet.walletAddress} ---\n--- Ticket Status: ${ticketTxStatus} ---\n`);
//             } else {
//                 console.log(`------- Ticket: ${ticket.name} -------\n--- Circle: ${ticket.wallet.circle.circleName} ---\n--- Circle Organizer: ${ticket.wallet.circle.organizer.email} ---\n--- Wallet Address: ${ticket.wallet.walletAddress} ---\n--- Ticket Status: ${ticketTxStatus} ---\n`);
//             }
//         }, (i * 6000));
//     });
// }

// const payloadObject = async (
//     mintDate: Date,
//     startDate: Date,
//     endDate: Date,
//     banner: string | undefined | null,
//     name: string,
//     creator: User | Circle,
//     price: number,
//     currency: string,
//     minted: number,
//     copies: number,
//     features: string,
//     description: string
// ) => {
//     const date = mintDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const start = startDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const end = endDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     return {
//         avalanche: {
//             img: (typeof banner === 'string' && banner.length > 0) ? `https://api.flashback.one/${banner}` : '',
//             name: name,
//             creator: (creator instanceof User) ? `User: ${creator.fullName}` : `Circle: ${creator.circleName}`,
//             mintDate: date,
//             eventStartDate: start,
//             eventEndDate: end,
//             price: price,
//             currency: currency,
//             count: `${Number(minted) + 1}/${Number(minted) + Number(copies)}`,
//             features: features,
//             description: description
//         }
//     };
// }

// const ticketAndAddressRecreation = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const circle: Circle = await Circle.findByPk(12, {
//         include: [User, {
//             model: Wallet,
//             include: [Ticket]
//         }]
//     });
//     const username: string = avalanche.bintools.cb58Encode(
//         Buffer.from(await bcrypt.hash(circle.circleName, 10))
//     );
//     const password: string = (await circle.getWalletCredentials()).password;
//     // const {username, password} = await circle.getWalletCredentials();
//     await avalanche.createUser(
//         username,
//         password
//     );
//     const {xChain, cChain} = await avalanche.createAddress(
//         username,
//         password
//     );
//     await circle.wallet.update({
//         walletAddress: xChain,
//         cChainAddress: cChain,
//         username: username
//     });
//     const avaxTransferTx: string = await avalanche.sendAvax(circle.wallet.walletAddress, 'creationTxFee');
//     const txStatus: string = await avalanche.waitTx(avaxTransferTx);
//     if (txStatus !== 'Accepted') {
//         throw new Error('Transaction is not accepted');
//     }
//     const creationTx: string = await avalanche.createNFT(
//         username,
//         password,
//         circle.wallet.walletAddress,
//         circle.wallet.tickets.map(x => x.name)[0],
//         Number(circle.wallet.tickets.map(x => x.copies)[0])
//     );
//     console.log(circle.wallet.tickets.map(x => x.copies)[0])
//     circle.wallet.tickets.map(async x => await x.update({
//         TicketAssetId: creationTx
//     }));
//     console.log(creationTx);
// }
// ticketAndAddressRecreation().then().catch(e => console.log(e));
// main().then().catch(e => console.log(e.message));

// const main = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             EventModelId: (await EventModel.findOne({
//                 where: {
//                     name: 'ComeOnOver Tour 2021'
//                 }
//             })).id
//         },
//         include: [{
//             model: NftBalance,
//             include: [{
//                 model: Wallet,
//                 include: [User]
//             }]
//         }],
//         order: [['createdAt', 'ASC']],
//     });
//     await migrateNftBalances(tickets);
//     // await recreateTickets();
// }

// const recreateTickets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             id: {
//                 [Op.in]: [131, 132, 133, 134, 135, 136, 137, 138, 139]
//             }
//         },
//         include: [{
//             model: Wallet,
//             include: [{
//                 model: Circle,
//                 include: [User, Wallet]
//             }, User]
//         }]
//     });
//     tickets.map((ticket: Ticket, i: number) => {
//         setTimeout(async () => {
//             if (await avalanche.xChain.getTxStatus(ticket.TicketAssetId) !== 'Accepted') {
//                 const balance: any = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//                 const txFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+txFee['creationTxFee'])) {
//                     const avaxTransfer: string = await avalanche.sendAvax(ticket.wallet.walletAddress, 'creationTxFee');
//                     const avaxStatus: string = await avalanche.waitTx(avaxTransfer);
//                     if (avaxStatus !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Transaction is not accepted'
//                         });
//                     }
//                 }
//                 const walletOwner: IWalletOwner = ticket.wallet.circle || ticket.wallet.user;
//                 const {username, password} = await walletOwner.getWalletCredentials();
//                 const createNft: string = await avalanche.createNFT(
//                     username,
//                     password,
//                     ticket.wallet.walletAddress,
//                     ticket.name,
//                     (Number(ticket.copies) + Number(ticket.minted))
//                 );
//                 const createStatus: string = await avalanche.waitTx(createNft);
//                 if (createStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 await ticket.update({
//                     TicketAssetId: createNft
//                 });
//                 console.log(`--- Status: ${await avalanche.xChain.getTxStatus(createNft)} ---\n`);
//             } else {
//                 console.log(`--- Ticket accepted: ${ticket.id} ---\n--- Ticket Asset ID: ${ticket.TicketAssetId} ---\n`);
//             }
//             console.log(`Done ${i}\n`)
//         }, i * 8000);
//     });
// }

// recreateTickets().then();

// const migrateNftBalances = async (
//     testTickets: Ticket[]
// ) => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     let countTickets: number = testTickets.map((ticket: Ticket) => ticket.balances.length).reduce((x, y) => x + y);
//     let count: number = 0, index: number = 7;
//     const avalanche: AvalancheApi = new AvalancheApi();
//     testTickets[index].balances.map(async (testBalance: NftBalance, j: number) => {
//         setTimeout(async () => {
//             const prodTicket: Ticket = await Ticket.findOne({
//                 where: {
//                     name: testTickets[index].name
//                 },
//                 include: [{
//                     model: Wallet,
//                     include: [{
//                         model: Circle,
//                         include: [User, Wallet]
//                     }]
//                 }, EventModel]
//             });
//             const owner: User = await User.findOne({
//                 where: {
//                     email: testBalance.wallet.user.email,
//                     // walletId: {
//                     //     [Op.notIn]: [734, 737]
//                     // }
//                 },
//                 include: [Wallet]
//             });
//             if (owner && owner.walletId == null) {
//                 const username: string = avalanche.bintools.cb58Encode(
//                     Buffer.from(await bcrypt.hash(owner.email, 10))
//                 )
//                 await avalanche.createUser(username, owner.password);
//                 const {xChain, cChain} = await avalanche.createAddress(username, owner.password);
//                 const wallet: Wallet = await Wallet.create({
//                     walletAddress: xChain,
//                     cChainAddress: cChain,
//                     username: username
//                 });
//                 await owner.update({
//                     walletId: wallet.id
//                 });
//             }
//             if (owner) {
//                 const ticketOwner: IWalletOwner = prodTicket.wallet.circle;
//                 const {username, password} = await ticketOwner.getWalletCredentials();
//                 const payload: any = await payloadObject(
//                     new Date(),
//                     prodTicket.event.startTime,
//                     prodTicket.event.endTime,
//                     prodTicket.banner,
//                     prodTicket.name,
//                     prodTicket.wallet.circle,
//                     prodTicket.price,
//                     prodTicket.currency,
//                     prodTicket.minted,
//                     prodTicket.copies,
//                     prodTicket.features,
//                     prodTicket.description
//                 );
//                 const balance: any = await avalanche.getAvaxBalance(prodTicket.wallet.walletAddress);
//                 const txFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+txFee['txFee'])) {
//                     const avaxTransfer: string = await avalanche.sendAvax(
//                         prodTicket.wallet.walletAddress,
//                         'txFee'
//                     );
//                     const avaxTransferStatus: string = await avalanche.waitTx(avaxTransfer);
//                     if (avaxTransferStatus !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Transaction is not accepted'
//                         });
//                     }
//                 }
//                 const mintTx: string = await avalanche.mintNFT(
//                     username,
//                     password,
//                     prodTicket.wallet.walletAddress,
//                     prodTicket.TicketAssetId,
//                     prodTicket.TicketAssetId,
//                     owner.wallet.walletAddress,
//                     payload,
//                     prodTicket.minted
//                 );
//                 const mintTxStatus: string = await avalanche.waitTx(mintTx);
//                 if (mintTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 const avaxTransfer2: string = await avalanche.sendAvax(prodTicket.wallet.walletAddress, 'txFee');
//                 const avaxTransfer2Status: string = await avalanche.waitTx(avaxTransfer2);
//                 if (avaxTransfer2Status !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 const sendTx: string = await avalanche.sendNFT(
//                     username,
//                     password,
//                     prodTicket.wallet.walletAddress,
//                     owner.wallet.walletAddress,
//                     prodTicket.TicketAssetId,
//                     mintTx
//                 );
//                 const sendTxStatus: string = await avalanche.waitTx(sendTx);
//                 if (sendTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Transaction is not accepted'
//                     });
//                 }
//                 await NftBalance.create({
//                     walletId: owner.walletId,
//                     tokenId: prodTicket.id,
//                     txid: sendTx,
//                     isPublic: !!owner.FlashBsPrivate,
//                     groupId: prodTicket.minted
//                 });
//                 await prodTicket.decrement('copies');
//                 await prodTicket.increment('minted');
//                 console.log(`\n-------- Ticket creator --------\n--- Username: ${username} ---\n--- Password: ${password} ---`)
//                 console.log(`\n--- Ticket Name: ${prodTicket.name} ---\n--- Owner: ${owner.email} ---\n--- Number: ${count += 1}`);
//             } else {
//                 console.log(`\nOwner already has ticket!`);
//             }
//         }, j * 12000);
//     });
//     testTickets.map(async (testTicket: Ticket, i: number) => {
//         setTimeout(async () => {
//             const prodTicket: Ticket = await Ticket.findOne({
//                 where: {
//                     name: testTicket.name
//                 },
//                 include: [{
//                     model: Wallet,
//                     include: [{
//                         model: Circle,
//                         include: [User, Wallet]
//                     }]
//                 }]
//             });
//             console.log(`--- ${testTicket.balances.length} ---`)
//             testTicket.balances.map(async (testBalance: NftBalance, j: number) => {
//                 setTimeout(async () => {
//                     const owner: User = await User.findOne({
//                         where: {
//                             email: testBalance.wallet.user.email
//                         },
//                         include: [Wallet]
//                     });
//                     const ticketOwner: IWalletOwner = prodTicket.wallet.circle;
//                     const {username, password} = await ticketOwner.getWalletCredentials();
//                     console.log(`\n-------- Ticket creator --------\n--- Username: ${username} ---\n--- Password: ${password} ---`)
//                     // const mintTx: string = await avalanche.mintNFT()
//                     console.log(`\n--- Ticket Name: ${prodTicket.name} ---\n--- Owner: ${owner.email} ---\n--- Number: ${count += 1}`);
//                 }, j * 2000);
//             });
//         }, i * (testTicket.balances.length) * 4000);
//     });
// }

// const migrateTickets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             EventModelId: (await EventModel.findOne({
//                 where: {
//                     name: 'ComeOnOver Tour 2021'
//                 }
//             })).id
//         },
//         order: [
//             ['id', 'ASC']
//         ],
//         include: [{
//             model: Wallet,
//             include: [{
//                 model: Circle,
//                 include: [User]
//             }]
//         }]
//     });
//     tickets.map((ticket: Ticket, i: number) => {
//         setTimeout(async () => {
//             const ticketTxStatus: string = await avalanche.checkAccept(ticket.TicketAssetId);
//             if (ticketTxStatus !== 'Accepted') {
//                 const balance: any = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//                 const creationTxFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+creationTxFee['creationTxFee'])) {
//                     const sendAvax: string = await avalanche.sendAvax(ticket.wallet.walletAddress, 'creationTxFee');
//                     const avaxTransferTxStatus: string = await avalanche.waitTx(sendAvax);
//                     if (avaxTransferTxStatus !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Tx is not accepted.'
//                         });
//                     }
//                 }
//                 const ticketTx: string = await avalanche.createNFT(
//                     ticket.wallet.username,
//                     avalanche.bintools.cb58Encode(
//                         Buffer.from(ticket.wallet.circle.organizer.password)
//                     ),
//                     ticket.wallet.walletAddress,
//                     ticket.name,
//                     ticket.copies
//                 );
//                 const creationTxStatus: string = await avalanche.waitTx(ticketTx);
//                 if (creationTxStatus !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Creation Tx is not accepted'
//                     });
//                 }
//                 await ticket.update({
//                     TicketAssetId: ticketTx
//                 });
//                 console.log(`------- Ticket: ${ticket.name} -------\n--- Circle: ${ticket.wallet.circle.circleName} ---\n--- Circle Organizer: ${ticket.wallet.circle.organizer.email} ---\n--- Wallet Address: ${ticket.wallet.walletAddress} ---\n--- Ticket Status: ${ticketTxStatus} ---\n`);
//             } else {
//                 console.log(`------- Ticket: ${ticket.name} -------\n--- Circle: ${ticket.wallet.circle.circleName} ---\n--- Circle Organizer: ${ticket.wallet.circle.organizer.email} ---\n--- Wallet Address: ${ticket.wallet.walletAddress} ---\n--- Ticket Status: ${ticketTxStatus} ---\n`);
//             }
//         }, (i * 6000));
//     });
// }

// const payloadObject = async (
//     mintDate: Date,
//     startDate: Date,
//     endDate: Date,
//     banner: string | undefined | null,
//     name: string,
//     creator: User | Circle,
//     price: number,
//     currency: string,
//     minted: number,
//     copies: number,
//     features: string,
//     description: string
// ) => {
//     const date = mintDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const start = startDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const end = endDate
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     return {
//         avalanche: {
//             img: (typeof banner === 'string' && banner.length > 0) ? `https://api.flashback.one/${banner}` : '',
//             name: name,
//             creator: (creator instanceof User) ? `User: ${creator.fullName}` : `Circle: ${creator.circleName}`,
//             mintDate: date,
//             eventStartDate: start,
//             eventEndDate: end,
//             price: price,
//             currency: currency,
//             count: `${Number(minted) + 1}/${Number(minted) + Number(copies)}`,
//             features: features,
//             description: description
//         }
//     };
// }

// const getBugWallets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         logging: false,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const users: User[] = await User.findAll({
//         include: [{
//             model: Circle,
//             include: [Wallet]
//         }, Wallet],
//         where: {
//             walletId: {
//                 [Op.ne]: null
//             }
//         },
//         order: [['id', 'desc']]
//     });
//     const wallets: Array<{
//         username: string,
//         password: string,
//         walletAddress: string
//     }> = await walletCredentials(users);
//     wallets.map(async (wallet: {username: string, password: string, walletAddress: string}) => {
//         const isCorrect: boolean = await isCorrectPassword(wallet);
//         console.log(`\n--- Wallet Address: ${wallet.walletAddress} ---\n--- Is Correct: ${isCorrect} ---\n`);
//     });
// }
//
// const walletCredentials = async (
//     users: User[]
// ): Promise<Array<{
//     username: string,
//     password: string,
//     walletAddress: string
// }>> => {
//     let result: Array<{
//         username: string,
//         password: string,
//         walletAddress: string
//     }> = [];
//     result = await Promise.all(users.map(async (user: User) => {
//         if (user.circle)
//             return new Promise<{
//                 username: string,
//                 password: string,
//                 walletAddress: string
//             }>(async (resolve, reject) => resolve({
//                 ...(await user.circle.getWalletCredentials()),
//                 walletAddress: user.circle.wallet.walletAddress
//             }));
//         return new Promise<{
//             username: string,
//             password: string,
//             walletAddress: string
//         }>(async (resolve, reject) => resolve({
//             ...(await user.getWalletCredentials()),
//             walletAddress: user.wallet.walletAddress
//         }));
//     }));
//
//     return result;
// }
//
// const isCorrectPassword = async (result: {
//     username: string,
//     password: string,
//     walletAddress: string
// }): Promise<boolean> => {
//     const avalanche: AvalancheApi = new AvalancheApi();
//     try {
//         await avalanche.xChainExportKey(result.username, result.password, result.walletAddress);
//     } catch (e) {
//         return false;
//     }
//     return true;
// }
// getBugWallets().then().catch(e => console.log(e.message));

// const ticketAndAddressRecreation = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const circle: Circle = await Circle.findByPk(12, {
//         include: [User, {
//             model: Wallet,
//             include: [Ticket]
//         }]
//     });
//     const username: string = avalanche.bintools.cb58Encode(
//         Buffer.from(await bcrypt.hash(circle.circleName, 10))
//     );
//     const password: string = (await circle.getWalletCredentials()).password;
//     // const {username, password} = await circle.getWalletCredentials();
//     await avalanche.createUser(
//         username,
//         password
//     );
//     const {xChain, cChain} = await avalanche.createAddress(
//         username,
//         password
//     );
//     await circle.wallet.update({
//         walletAddress: xChain,
//         cChainAddress: cChain,
//         username: username
//     });
//     const avaxTransferTx: string = await avalanche.sendAvax(circle.wallet.walletAddress, 'creationTxFee');
//     const txStatus: string = await avalanche.waitTx(avaxTransferTx);
//     if (txStatus !== 'Accepted') {
//         throw new Error('Transaction is not accepted');
//     }
//     const creationTx: string = await avalanche.createNFT(
//         username,
//         password,
//         circle.wallet.walletAddress,
//         circle.wallet.tickets.map(x => x.name)[0],
//         Number(circle.wallet.tickets.map(x => x.copies)[0])
//     );
//     console.log(circle.wallet.tickets.map(x => x.copies)[0])
//     circle.wallet.tickets.map(async x => await x.update({
//         TicketAssetId: creationTx
//     }));
//     console.log(creationTx);
// }
// ticketAndAddressRecreation().then().catch(e => console.log(e));
// main().then().catch(e => console.log(e.message));

// const parseXLSX = async () => {
//     return xlsx.parse(`${__dirname}/wowsummit_users_list.xlsx`).map((x) => x.data)[0].map(([name, email, ticket]) => ({
//         name, email, ticket
//     }));
// }

// const sendTickets = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`],
//         logging: false
//     });
//     const pastIndex: number = 2106;
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const emails: string[] = (await parseXLSX()).slice(pastIndex + 1);
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             name: 'Blockchain Summit Latam Online Ticket'
//         },
//         include: [{
//             model: Wallet,
//             include: [User, Circle]
//         }, {
//             model: EventModel,
//             include: [
//                 {
//                     model: Circle,
//                     include: [User, Wallet]
//                 },
//                 {
//                     model: User,
//                     include: [Wallet]
//                 }
//             ]
//         }],
//         order: [['id', 'DESC']]
//     });
//     let ticket: Ticket = tickets[0];
//     // console.log(emails[0])
//     emails.map(async (email: string, i: number) => {
//         setTimeout(async () => {
//             if (ticket.copies < 1) {
//                 ticket = tickets[1];
//             }
//             const randInt: (start: number, end: number) => number = (start, end) => Math.floor(start + Math.random() * (end - start))
//             const char: (x: any) => string = (x) => String.fromCharCode(x);
//             const randomPassword: string = crypto.randomBytes(10).toString('hex') + '@' +  char(randInt(35, 38));
//             const passwordHash: string = await bcrypt.hash(randomPassword, Number(process.env.SALT_ROUNDS) || 10);
//             const userTo: User = await User.create({
//                 fullName: 'Name Surname',
//                 email: email,
//                 password: passwordHash
//             });
//             const avaUsername: string = avalanche.bintools.cb58Encode(
//                 Buffer.from(
//                     await bcrypt.hash(
//                         email,
//                         Number(process.env.SALT_ROUNDS)
//                     )
//                 )
//             );
//             await avalanche.createUser(
//                 avaUsername,
//                 passwordHash
//             );
//             const {xChain, cChain} = await avalanche.createAddress(
//                 avaUsername,
//                 passwordHash
//             );
//             const wallet = await Wallet.create({
//                 walletAddress: xChain,
//                 cChainAddress: cChain,
//                 username: avaUsername
//             });
//             await userTo.update({
//                 walletId: wallet.id
//             });
//             const balance = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//             const txFee = await avalanche.getTxFee();
//             if ((+balance) < (+txFee['txFee'])) {
//                 const money = await avalanche.sendAvax(ticket.wallet.walletAddress, 'txFee');
//                 const feeMoney = await avalanche.waitTx(money);
//
//                 if (feeMoney !== 'Accepted') {
//                     throw new CustomError({
//                         status: 500,
//                         message: 'Fee tx not accepted'
//                     });
//                 }
//             }
//             const sendTx: string = await mintToken(
//                 ticket,
//                 xChain
//             );
//             await NftBalance.create({
//                 walletId: userTo.walletId,
//                 txid: sendTx,
//                 tokenId: ticket.id,
//                 groupId: (ticket.copies - 1)
//             });
//             await ticket.decrement('copies');
//             await ticket.increment('minted');
//             const message = await sendEmail(
//                 ticket.wallet.circle.circleName,
//                 email,
//                 randomPassword
//             );
//             console.log(message);
//             console.log(`\n--- TX Hash: ${sendTx} ---\n--- Receiver: ${xChain} ---\n--- Sender: ${ticket.wallet.walletAddress} ---\n--- Index: ${pastIndex + i + 1} ---\n`);
//         }, i * 8000);
//     });
// }
//

// const resetPassword = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const user: User = await User.findByPk(3066, {
//         include: [Verification, Wallet]
//     });
//     const {username, password} = await user.getWalletCredentials();
//     const randomPassword: string = `${crypto.randomBytes(10).toString('hex')}#${Math.floor(Math.random() * 2021)}${crypto.randomBytes(6).toString('hex')}`;
//     const hash: string = await bcrypt.hash(randomPassword, 10);
//     const privateKey: string = await avalanche.xChainExportKey(username, password, user.wallet.walletAddress);
//     await avalanche.deleteUser(username, password);
//     await avalanche.createUser(username, hash);
//     await avalanche.xChainImportKey(username, hash, privateKey);
//     await avalanche.cChainImportKey(username, hash, privateKey);
//     await user.update({
//         password: hash
//     });
//     const message = await mailchimp.messages.send({
//         message: {
//             subject: 'Confirm Your FlashBack Account to Continue Browsing',
//             text: `Hi, ${user.fullName},\n\nYou're almost ready to start enjoying FlashBack.\nPlease kindly verify that this is your email address by clicking here: https://flashback.one/signUp?token=${user.verification.token}\n\nYour login: ${user.email}\nYour password: ${randomPassword}\n\nBest regards,\nFlashback Team`,
//             from_name: 'Flashback Team',
//             from_email: process.env.MC_EMAIL,
//             to: [
//                 {
//                     email: user.email,
//                 }
//             ]
//         }
//     });
//     console.log(message)
// }
// resetPassword().then();

// const mintToken = async (ticket: Ticket, xChain: string): Promise<string> => {
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const {username, password} = await ticket.wallet.circle.getWalletCredentials();
//     const day = new Date()
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const startDate = ticket.event.startTime
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const endDate = ticket.event.endTime
//         .toISOString()
//         .replace(
//             /^(\d+)-(\d+)-(\d+)(?:T|\x20)((?:\d+:*)+)\.\d+(?:Z|\+\d+)$/g,
//             '$1.$2.$3 $4'
//         );
//     const payload = {
//         avalanche: {
//             img: `https://api.flashback.one/${ticket.banner}`,
//             name: ticket.name,
//             creator: ticket?.wallet?.user ? `User: ${ticket.wallet.user.fullName}` : `Circle: ${ticket.wallet.circle.circleName}`,
//             mintDate: day,
//             eventStartDate: startDate,
//             eventEndDate: endDate,
//             price: ticket.price,
//             currency: ticket.currency,
//             count: `${Number(ticket.minted) + 1}/${Number(ticket.minted) + Number(ticket.copies)}`,
//             features: ticket.features,
//             description: ticket.description
//         }
//     };
//     return await avalanche.mintNFT(
//         username,
//         password,
//         ticket.wallet.walletAddress,
//         ticket.TicketAssetId,
//         ticket.TicketAssetId,
//         xChain,
//         payload,
//         ticket.copies
//     );
// }

// const ticketSend = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const user: User = await User.findByPk(282, {
//         include: [{
//             model: Wallet,
//             include: [NftBalance]
//         }]
//     });
//     const balanceTokens = user.wallet.balances.map(x => Number(x.tokenId));
//     const tickets: Ticket[] = await Ticket.findAll({
//         where: {
//             EventModelId: {
//                 [Op.in]: [20, 73]
//             }
//         },
//         include: [{
//             model: Wallet,
//             include: [Circle]
//         }, EventModel]
//     });
//     console.log(tickets.length);
//     tickets.map((ticket: Ticket, i: number) => {
//         setTimeout(async () => {
//             if (!balanceTokens.includes(Number(ticket.id))) {
//                 const sendBalance: string = await avalanche.sendAvax(ticket.wallet.walletAddress, 'txFee');
//                 const waitTx: string = await avalanche.waitTx(sendBalance);
//                 if (waitTx !== 'Accepted') {
//                     throw new Error('Not Accepted!');
//                 }
//                 const mintTx: string = await mintToken(ticket, user.wallet.walletAddress);
//                 await NftBalance.create({
//                     walletId: user.walletId,
//                     tokenId: ticket.id,
//                     txid: mintTx,
//                     groupId: (ticket.copies - 1)
//                 });
//                 await ticket.decrement('copies');
//                 await ticket.increment('minted');
//                 console.log('Done');
//             } else {
//                 console.log(`${user.fullName} has ${ticket.name}`);
//             }
//         }, i * 1000);
//     });
// }
// ticketSend().then().catch(e => console.log(e));
// const checkSignUps = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     let count: number = 0;
// //     const usersXlsx = [{
// //         name: 'Fahdsami',
// //         email: 'fahdsami@naurillion.com',
// //         ticket: 'standart'
// //     }];
// //     console.log(usersXlsx);
// //     usersXlsx.map(async (userXlsx: { name: string, email: string, ticket: string }, i: number) => {
// //         setTimeout(async () => {
// //             let user: User = await User.findOne({
// //                 where: {
// //                     email: {
// //                         [Op.iLike]: `%${userXlsx.email}%`
// //                     }
// //                 },
// //                 include: [Wallet, Verification]
// //             });
// //             let token: string = '', randomPassword: string = '';
// //             if (!user) {
// //                 randomPassword = `${crypto.randomBytes(10).toString('hex')}#${Math.floor(Math.random() * 2021)}${crypto.randomBytes(6).toString('hex')}`;
// //                 const hash = await bcrypt.hash(randomPassword, 10);
// //                 const newUser: User = await User.create({
// //                     fullName: userXlsx.name,
// //                     email: userXlsx.email,
// //                     password: hash
// //                 });
// //                 token = crypto.randomBytes(64).toString('hex');
// //                 const verification: Verification = await Verification.create({
// //                     token: token
// //                 });
// //                 await newUser.update({
// //                     verificationId: verification.id
// //                 });
// //                 const username: string = avalanche.encodedString(await bcrypt.hash(newUser.email,10));
// //                 await avalanche.createUser(username, hash);
// //                 const {xChain, cChain} = await avalanche.createAddress(username, newUser.password);
// //                 const wallet: Wallet = await Wallet.create({
// //                     walletAddress: xChain,
// //                     cChainAddress: cChain,
// //                     username: username
// //                 });
// //                 await newUser.update({
// //                     walletId: wallet.id
// //                 });
// //                 await newUser.reload();
// //                 await wallet.reload();
// //                 const ticket: Ticket = await Ticket.findOne({
// //                     where: {
// //                         name: {
// //                             [Op.iLike]: '%standart%'
// //                             /*`%${userXlsx.ticket.trim().toLowerCase() !== 'standard' ? userXlsx.ticket.trim().toLowerCase().replace('-', ' ') : 'standart'}%`*/
// //                         },
// //                         EventModelId: 73
// //                     },
// //                     include: [{
// //                         model: EventModel,
// //                     }, {
// //                         model: Wallet,
// //                         include: [Circle]
// //                     }]
// //                 });
// //                 // console.log(ticket || order.ticketType);
// //                 const balance: BN = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
// //                 const txFee = await avalanche.getTxFee();
// //                 if ((+balance) < (+txFee['txFee'])) {
// //                     const money = await avalanche.sendAvax(ticket.wallet.walletAddress, 'txFee');
// //                     const feeMoney = await avalanche.waitTx(money);
// //
// //                     if (feeMoney !== 'Accepted') {
// //                         throw new CustomError({
// //                             status: 500,
// //                             message: 'Fee tx not accepted'
// //                         });
// //                     }
// //                 }
// //                 const mintTx: string = await mintToken(ticket, wallet.walletAddress);
// //                 await NftBalance.create({
// //                     walletId: wallet.id,
// //                     txid: mintTx,
// //                     tokenId: ticket.id,
// //                     groupId: (ticket.copies - 1)
// //                 });
// //                 await ticket.decrement('copies');
// //                 await ticket.increment('minted');
// //                 const message: any = await sendEmail(token, newUser.email, newUser.fullName, randomPassword);
// //                 console.log(message);
// //                 console.log(`--- Tx Hash: ${mintTx} ---\n--- Receiver: ${wallet.walletAddress} ---\n--- Count: ${count + 1 + i} ---`)
// //             } else {
// //                 console.log(`\n--- Email: ${userXlsx.email} ---\n--- Ticket: ${userXlsx.ticket} ---\n --- Wallet Address: ${user?.wallet?.walletAddress} ---`);
// //             }
// //         }, 8000 * i);
// //     });
//
//     // const users: User[] = await User.findAll({
//     //     where: {
//     //         email: {
//     //             [Op.in]: ['stanimal@tari.com']
//     //         }
//     //     },
//     //     include: [Wallet]
//     // });
//     //
//     // users.map(async (user: User, i) => {
//     //     setTimeout(async () => {
//     //         // const randomPassword: string = '1d214e9adb8fb44f719d#26248b085e92d28';
//     //         // const hash = await bcrypt.hash(randomPassword, 10);
//     //         // const {username, password} = await user.getWalletCredentials();
//     //         // if (await checkPassword(username, password, user.wallet.walletAddress)) {
//     //         //     const privateKey: string = await avalanche.xChainExportKey(username, password, user.wallet.walletAddress);
//     //         //     await avalanche.deleteUser(username, password);
//     //         //     await avalanche.createUser(username, hash);
//     //         //     await avalanche.xChainImportKey(username, hash, privateKey);
//     //         //     await avalanche.cChainImportKey(username, hash, privateKey);
//     //         //     console.log(hash);
//     //         //     await user.update({
//     //         //         password: hash
//     //         //     });
//     //         //     console.log('Done')
//     //         // }
//     //         const ticket: Ticket = await Ticket.findOne({
//     //             where: {
//     //                 name: {
//     //                     [Op.iLike]: '%one day%'
//     //                 },
//     //                 EventModelId: 73
//     //             },
//     //             include: [{
//     //                 model: EventModel,
//     //             }, {
//     //                 model: Wallet,
//     //                 include: [Circle]
//     //             }]
//     //         });
//     //         // console.log(ticket || order.ticketType);
//     //         const balance: BN = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//     //         const txFee = await avalanche.getTxFee();
//     //         if ((+balance) < (+txFee['txFee'])) {
//     //             const money = await avalanche.sendAvax(ticket.wallet.walletAddress, 'txFee');
//     //             const feeMoney = await avalanche.waitTx(money);
//     //
//     //             if (feeMoney !== 'Accepted') {
//     //                 throw new CustomError({
//     //                     status: 500,
//     //                     message: 'Fee tx not accepted'
//     //                 });
//     //             }
//     //         }
//     //         const mintTx: string = await mintToken(ticket, user.wallet.walletAddress);
//     //         await NftBalance.create({
//     //             walletId: user.wallet.id,
//     //             txid: mintTx,
//     //             tokenId: ticket.id,
//     //             groupId: (ticket.copies - 1)
//     //         });
//     //         await ticket.decrement('copies');
//     //         await ticket.increment('minted');
//     //         const message: any = await sendEmail(user.shortLink || String(user.id), user.email, user.fullName);
//     //         console.log(message);
//     //         console.log(`--- Tx Hash: ${mintTx} ---\n--- Receiver: ${user.wallet.walletAddress} ---\n--- Count: ${count + 1 + i} ---`)
//     //     }, i * 8000);
//     // });
//     const orders: Order[] = await Order.findAll({
//         where: {
//             // ticketType: {
//             //     [Op.in]: ['after-party', 'after-party-vip', 'bcawards-event']
//             // },
//             // userId: {
//             //     [Op.ne]: 1498
//             // }
//             id: {
//                 [Op.in]: [270]
//             }
//         },
//         include: [{
//             model: User,
//             include: [Wallet, Verification]
//         }],
//     });
//     orders.map(async (order: Order, i: number) => {
//         setTimeout(async () => {
//                 if (order.user.wallet === null) {
//                     const username: string = avalanche.encodedString(await bcrypt.hash(order.user.email, Number(process.env.SALT_ROUNDS) || 10));
//                     await avalanche.createUser(username, order.user.password);
//                     const {xChain, cChain} = await avalanche.createAddress(username, order.user.password);
//                     const wallet: Wallet = await Wallet.create({
//                         walletAddress: xChain,
//                         cChainAddress: cChain,
//                         username: username
//                     });
//                     await order.user.update({
//                         walletId: wallet.id
//                     });
//                     await order.user.reload();
//                     await order.user.wallet.reload();
//                 }
//                 const ticketTypes: any = {
//                     'bcawards-event': 'Awards + after-party',
//                     'after-party': 'Afterparty',
//                     'after-party-vip': 'After-party VIP'
//                 }
//                 const ticket: Ticket = await Ticket.findOne({
//                     where: {
//                         name: {
//                             [Op.iLike]: `%${ticketTypes[order.ticketType]}%`
//                         },
//                         EventModelId: 119
//                     },
//                     include: [{
//                         model: EventModel,
//                     }, {
//                         model: Wallet,
//                         include: [Circle]
//                     }]
//                 });
//                 console.log(order.user.wallet.walletAddress);
//                 console.log(order.user.walletId);
//                 console.log(ticket || order.ticketType);
//                 const balance: BN = await avalanche.getAvaxBalance(ticket.wallet.walletAddress);
//                 const txFee: any = await avalanche.getTxFee();
//                 if ((+balance) < (+txFee['txFee'])) {
//                     const money = await avalanche.sendAvax(ticket.wallet.walletAddress, 'txFee');
//                     const feeMoney = await avalanche.waitTx(money);
//
//                     if (feeMoney !== 'Accepted') {
//                         throw new CustomError({
//                             status: 500,
//                             message: 'Fee tx not accepted'
//                         });
//                     }
//                 }
//                 const mintTx: string = await mintToken(ticket, order.user.wallet.walletAddress);
//                 await NftBalance.create({
//                     walletId: order.user.wallet.id,
//                     txid: mintTx,
//                     tokenId: ticket.id,
//                     groupId: (ticket.copies - 1)
//                 });
//                 await ticket.decrement('copies');
//                 await ticket.increment('minted');
//                 const message: any = await sendEmail(order.user.shortLink || order.user.id, order.user.email, order.user.fullName);
//                 console.log(message);
//                 console.log(`--- Tx Hash: ${mintTx} ---\n--- Receiver: ${order.user.wallet.walletAddress} ---\n--- Count: ${count + 1 + i} ---`)
//         }, i * 8000);
//     });
// }
// checkSignUps().then().catch(e => console.log(e));

// const checkPassword = async (username: string, password: string, address: string): Promise<boolean> => {
//     const avalanche: AvalancheApi = new AvalancheApi();
//     try {
//         await avalanche.xChainExportKey(username, password, address);
//     } catch (e) {
//         return false;
//     }
//     return true;
// }

// const listInvalidPasswordUsers = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: 'flashback',
//         password: 'flA05$h0b8aCK#2021',
//         dialect: 'postgres',
//         host: '65.21.243.126',
//         port: 5432,
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const users: User[] = await User.findAll({
//         include: [{
//             model: Wallet,
//             include: [NftBalance]
//         }, {
//             model: Circle,
//             include: [Wallet]
//         }],
//         where: {
//             walletId: {
//                 [Op.ne]: null
//             },
//             id: 3402
//         }
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     users.map(async (user: User, i: number) => {
//         setTimeout(async () => {
//             // if (!!user.wallet) {
//                 const {username, password} = await user.getWalletCredentials();
    
//                 const correct: boolean = await checkPassword(username, password, user.wallet.walletAddress);
//                 if (!correct) {
//                     console.log(`\n--- \t\t User`);
//                     console.log(`--- \t Username: ${username}`);
//                     console.log(`--- \t Address: ${user.wallet.walletAddress}`);
//                     console.log(`--- \t User fullname: ${user.fullName}`);
//                     // console.log(`--- \t Is Correct: ${correct}\n`);
//                     console.log(`--- \t Nft Balance: ${!!user.wallet.balances}`);
//                     // await fs.promises.appendFile(`${__dirname}/users.csv`, `${user.email},${username},${user.fullName},${user.wallet.walletAddress}\n`)
//                 }
//             // }
//         }, i * 500);

//         // if (!!user.circle) {
//         //     user.circle.map(async (circle: Circle) => {
//         //         const {username, password, apiPassword} = await circle.getWalletCredentials();

//         //         const correct: boolean = await checkPassword(username, password, circle.wallet.walletAddress);
//         //         if (!correct) {
//         //             console.log(`--- \t\t Circle`);
//         //             console.log(`--- \t Username: ${username} \t ---`);
//         //             console.log(`--- \t Address: ${circle.wallet.walletAddress}-`);
//         //             console.log(`--- \t Circle Name: ${circle.circleName}`);
//         //             console.log(`--- \t Is Correct: ${correct}`);
//         //             console.log(`--- \t API Password: ${apiPassword}`);
//         //             console.log(`--- \t Password: ${password}`);
//         //             // await fs.promises.appendFile(`${__dirname}/circles.csv`, `${user.email},${username},${circle.circleName},${circle.wallet.walletAddress}\n`)
//         //         }
//         //     });
//         // }
//     });
// }

// listInvalidPasswordUsers().then();
//
// const changePasswords = async (): Promise<void> => {
//     const sequelizeInstance: Sequelize = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         logging: false,
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const users: User[] = await User.findAll({
//         include: [Wallet, {
//             model: Circle,
//             include: [Wallet]
//         }]
//     });
//     users.map(async (user: User, i: number) => {
//         const {username, password} = await user.getWalletCredentials();
//         const checked: boolean = await checkPassword(username, password, user.wallet.walletAddress);
//         if (!checked) {
//
//         }
//     });
// }

// checkSignUps().then().catch(e => console.log(e));
// parseXLSX().then(x => console.log(x)).catch(e => console.log(e));
// const sendMessage = async () => {
//     const sequelizeInstance = new Sequelize({
//         database: 'flashback_prod',
//         username: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         dialect: <Dialect>process.env.DB_DRIVER,
//         host: '65.21.243.126',
//         port: Number(process.env.DB_PORT),
//         models: [`${__dirname}/models/*.ts`]
//     });
//     const avalanche: AvalancheApi = new AvalancheApi();
//     const randInt: (start: number, end: number) => number = (start, end) => Math.floor(start + Math.random() * (end - start))
//     const char: (x: any) => string = (x) => String.fromCharCode(x);
//     const randomPassword: string = crypto.randomBytes(10).toString('hex') + '@' +  char(randInt(35, 38));
//     const passwordHash: string = await bcrypt.hash(randomPassword, Number(process.env.SALT_ROUNDS) || 10);
//     const userTo: User = await User.create({
//         fullName: 'Name Surname',
//         email: 'kozanashvili.teimuraz@gmail.com',
//         password: passwordHash
//     });
//     const avaUsername: string = avalanche.bintools.cb58Encode(
//         Buffer.from(
//             await bcrypt.hash(
//                 'kozanashvili.teimuraz@gmail.com',
//                 Number(process.env.SALT_ROUNDS)
//             )
//         )
//     );
//     await avalanche.createUser(
//         avaUsername,
//         passwordHash
//     );
//     const {xChain, cChain} = await avalanche.createAddress(
//         avaUsername,
//         passwordHash
//     );
//     const wallet = await Wallet.create({
//         walletAddress: xChain,
//         cChainAddress: cChain,
//         username: avaUsername
//     });
//     await userTo.update({
//         walletId: wallet.id
//     });
//     const message = await sendEmail(
//         'Blockchain Summit LatAm',
//         'kozanashvili.teimuraz@gmail.com',
//         randomPassword
//     );
// }
// sendMessage().then().catch(e => console.log(e.message));
// checkSignUps().then()
// sendTickets().then().catch(e => console.log(e.message));

const sendSome = async () => {
    const sequelizeInstance = new Sequelize({
        database: 'flashback_prod',
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        dialect: <Dialect>process.env.DB_DRIVER,
        host: '65.21.243.126',
        port: Number(process.env.DB_PORT),
        models: [`${__dirname}/models/*.ts`]
    });
    const events: EventModel[] = await EventModel.findAll({
        include: [Circle, User]
    });
    await fs.promises.writeFile(`${__dirname}/events.csv`, `"event_name","event_link","organizer_name","organizer_link"\n`);
    events.map(async (event: EventModel) => {
        await fs.promises.appendFile(`${__dirname}/events.csv`, `${event.name.trim() || ''},https://flashback.one/events/${event.shortLink ? event.shortLink : event.id},${event.COrganizerId ? event.circle.circleName.trim() || '' : event.organizer.fullName.trim() || ''},https://flashback.one${event.COrganizerId ? (`/circles/${event.circle.shortLink ? event.circle.shortLink : event.COrganizerId}`) : (`/users/${event.organizer.shortLink ? event.organizer.shortLink : event.organizerId}`)}\n`)
    });
//     const user: User = await User.findByPk(1498);
//     const message = await sendEmail(
//         user.shortLink || user.id,
//         user.email,
//         user.fullName
//     );
//     console.log(message);
}
//
sendSome().then().catch(e => console.log(e));