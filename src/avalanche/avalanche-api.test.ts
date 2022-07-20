import AvalancheApi from "./avalanche-api";
import dotenv from 'dotenv'
dotenv.config()
import Avalanche, { BinTools, BN, Buffer } from "avalanche";
import { promisify } from "util";
import { OutputOwners } from "avalanche/dist/common";
import  cliProgress from 'cli-progress';
const sleep = promisify(setTimeout);
const avalanche = new AvalancheApi();
import bcrypt from 'bcrypt';
import crypto from 'crypto';


// const main = async () => {
    
//     const avalanche = new AvalancheApi();

//     avalanche.sendNFT(
//         'Neon Lights Circle',
//         'iyVduRsccdxxTDZ13mbYAUV7cHjPnfdFiDV4pxzHMRxtockurZyWXkfSqKNiYFr1UeAuCL9Cqn6rrasD9ph2JUS',


//         'X-avax1zgxglxpu5wr0w5tk3g08tmx6sq5z2fg9edd5c0',
//         'X-avax1tl7x2875smucyvw0jl9qwzr77j69edq7pd9v9g',
        
//         'UiGcH2aPzFFJnp2hchFKU9VqzozFy1kSPDHE7DViFsw7tNUAj',
//         '26TBSXm6qUE4PmmeQxjFSR9jdQbUrEoKHppLwzvP62mpRG28cZ'
//     );
// }

// main().then();
// const TryCreateUser = async (username, passwordHash) => {
//     try {
//         const created = await avalanche.keystore.createUser(
//             username,
//             avalanche.binTools.cb58Encode(
//                 Buffer.from(passwordHash)
//             )
//         );
//         return created;
//     } catch (ex) {
//         if (ex.message == `user already exists: ${username}`) {
//             console.log('User already created');
//         }
//     }
// }

// const getTxStatus = async (txId) => {
//     const status = await avalanche.xChain.getTxStatus(txId);
//     console.log({ txId, status });
//     return status;
// }

// const isHealty = async () => {
//     const liveness = await avalanche.avalanche.Health().getLiveness() as any;
//     console.log(liveness);
//     return liveness.healthy;
// }
// const watiTx = async (txId) => {
//     let iters = 0;
//     do {
//         const status = await getTxStatus(txId);
//         if (status !== 'Processing') {
//             return status;
//         }
//         await sleep(1000);
//         iters++
//     } while (iters < 300)
//     throw new Error('Still processing after five minutes, timeout');
// }

//interface buildMintNFTTXIface {
//     networkID: number;
//     blockchainID: Buffer;
//     owners: OutputOwners[];
//     fromAddresses: Buffer[];
//     changeAddresses: Buffer[];
//     utxoids: string[];
//     groupID?: number;
//     payload?: Buffer;
//     fee?: BN;
//     feeAssetID?: Buffer;
//     memo?: Buffer;
//     asOf?: BN
// }

// async function test() {
//     if (!process.env.AVADEV) {
//         return;
//     }
//     const healthy = await isHealty();
//     if (!healthy) {
//         throw new Error("Unhealty chain");
//     }

//     console.log('c', avalanche.avalanche.CChain().getBlockchainID())
//     console.log('x', avalanche.avalanche.XChain().getBlockchainID())


//     const username = 'New User';
//     const passwordHash = 'password';


//     const user = await TryCreateUser(username, passwordHash); //await avalanche.createUser(username, passwordHash);
//     //const address = await avalanche.createAddress(username, passwordHash);
//     // console.log(address);
//     const address = await avalanche.listAddresses(username, passwordHash);

//     const balance = await avalanche.xChain.getAllBalances(address[0]);
//     console.log({ address, balance });

//     const nft = await avalanche.createNFTAsset(
//         address[0],
//         'New Some NFT',
//         1,
//         'features'
//     );
//     console.log('nft tx', nft);
//     await watiTx(nft);

//     const { numFetched, utxos } = await avalanche.xChain.getUTXOs(address[0]);
//     console.log(numFetched);
//     const nftUtxo = utxos.getAllUTXOs().find((e) => avalanche.binTools.cb58Encode(e.getTxID()) === nft)
//     console.log({ nftUtxo });

//     const output = nftUtxo.getOutput();
//     console.log(output);
//     const addr = output.getAddress(0);
//     const outputAddress = new OutputOwners([addr]);
//     const avaxId = await avalanche.xChain.getAVAXAssetID();
//     console.log(avaxId);
//     const asdf: buildMintNFTTXIface = {
//         networkID: 12345,
//         blockchainID: avalanche.binTools.cb58Decode(
//             avalanche.xChain.getBlockchainID()
//         ),
//         owners: [outputAddress],
//         fromAddresses: [addr],
//         changeAddresses: [addr],
//         utxoids: [nftUtxo.getUTXOID()],
//         groupID: undefined,
//         payload: Buffer.from('AAAA'),
//         fee: avalanche.xChain.getDefaultTxFee(),
//         feeAssetID: avaxId,
//     };
//     const vals = Object.values(asdf);
//     //@ts-ignore
//     const mintTx = utxos.buildCreateNFTMintTx(...vals);
//     console.log(mintTx);

//     const signed = await avalanche.xChain.signTx(mintTx);
//     const mintTxId = await avalanche.xChain.issueTx(signed);
//     return mintTxId
//     //await watiTx(mintTxId);
//     // avalanche.xChain.buildCreateNFTMintTx(
//     //     uxtos,
//     //     address[0],

//     // )   
//     // const minted = await avalanche.mintNFT(
//     //     address[0],
//     //     nft,
//     //     'features',
//     //     0 // TODO: FIX GROUP ID IF YOU WANT THIS TO WORK
//     // );
//     // console.log('minted', minted);
//     // console.log('sent', send)
// }

// async function stress() {
//     // create a new progress bar instance and use shades_classic theme
//     const all = [];
    // const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    // bar1.start(500, 0);
//     for (let i = 0; i < 500; i++) {
//         const x = await test();
//         all.push(x);
//         bar1.update(i + 1);
//     }
//     bar1.stop();
// }

// async function tokenCreationStress(): Promise<void> {
    // const progressBar: any = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    // let copies: number = 3000;
    // progressBar.start(1, 0);
    // for (let i = 0; i < 10; i++) {
        // const username: string = avalanche.bintools.cb58Encode(
        //     Buffer.from(await bcrypt.hash(crypto.randomBytes(64).toString('hex'), 10))
        // );
        // const password: string = await bcrypt.hash(crypto.randomBytes(64).toString('hex'), 10);
        // const newUser: boolean = await avalanche.createUser(
        //     username,
        //     password
        // );
        // if (!newUser) {
        //     throw new Error('Can\'t create user');
        // }
        // const {xChain, cChain} = await avalanche.createAddress(
        //     username,
        //     password
        // );
        // const avaxTx: string = await avalanche.sendAvax(
        //     xChain,
        //     'creationTxFee'
        // );
        // let avaxTxStatus: string = await avalanche.waitTx(avaxTx);
        // if (avaxTxStatus !== 'Accepted') {
        //     avaxTxStatus = await avalanche.waitTx(avaxTx);
        // }
        // const ticketName: string = crypto.randomBytes(32).toString('hex');
        // const creationTx: string = await avalanche.createNFT(
        //     username,
        //     password,
        //     xChain,
        //     ticketName,
        //     copies
        // );
        // let creationTxStatus: string = await avalanche.waitTx(creationTx);
        // if (creationTxStatus !== 'Accepted') {
        //     creationTxStatus = await avalanche.waitTx(creationTx);
        // }
        // console.log(`\n--- Creator: ${xChain} ---\n--- Ticket Asset ID: ${creationTx} ---\n--- AVAX Transfer Status: ${avaxTxStatus} ---\n--- Copies: ${copies} ---`);
        // const deleted: boolean = await avalanche.deleteUser(
        //     username,
        //     password
        // );
        // progressBar.update(1);
    // }
    // progressBar.stop();
// }

// tokenCreationStress().then().catch(e => console.log(`\n--- Error: ${e.message} ---`));
// stress().then();
// test().then(data => console.log)