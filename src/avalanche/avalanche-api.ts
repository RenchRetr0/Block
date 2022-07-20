import Avalanche, { BinTools, BN, Buffer } from "avalanche";
import {
    AVMAPI,
    AVMConstants,
    KeyChain as XKeyChain,
    MinterSet,
    Tx,
    UnsignedTx,
    UTXO,
    UTXOSet,
} from "avalanche/dist/apis/avm";
import { KeystoreAPI } from "avalanche/dist/apis/keystore";
import { EVMAPI, KeyChain as CKeyChain } from "avalanche/dist/apis/evm";
import { Defaults, JSONPayload, UnixNow } from "avalanche/dist/utils";
import { OutputOwners } from "avalanche/dist/common";
import { InfoAPI } from "avalanche/dist/apis/info";
import * as dotenv from "dotenv";
dotenv.config();

type avmUTXOResponseT = ReturnType<AVMAPI["getUTXOs"]> extends Promise<infer T>
    ? T
    : never;
function deepEqualsBad(a: any, b: any) {
    try {
        const sortedA = Object.fromEntries(
            Object.entries(a).sort((aa, bb) => aa[0].localeCompare(bb[0]))
        );
        const sortedB = Object.fromEntries(
            Object.entries(b).sort((aa, bb) => aa[0].localeCompare(bb[0]))
        );
        return JSON.stringify(sortedA) === JSON.stringify(sortedB);
    } catch (err) {
        console.error(
            "DeepEquals: A & B cannot be properly compared, please use real deepEqals and not this peace of crap"
        );
        console.error("Original Error: ");
        console.error(err);
        console.error("===========");
        return false;
    }
}
class AvalancheApi {
    avalanche: Avalanche;
    xChain: AVMAPI;
    cChain: EVMAPI;
    info: InfoAPI;
    keystore: KeystoreAPI;
    xKeyChain: XKeyChain;
    cKeyChain: CKeyChain;
    bintools: BinTools;
    privateKey: string = process.env.PRIVATE_KEY;
    adminAddress: string = process.env.ADMIN_ADDRESS;
    // Nice types avalancheJS!
    defaultNetwork: any;

    constructor() {
        this.avalanche = new Avalanche(
            process.env.NODE_HOST,
            Number(process.env.NODE_PORT),
            process.env.NODE_PROTOCOL,
            Number(process.env.NETWORK_ID)
        );

        this.defaultNetwork = Defaults.network[Number(process.env.NETWORK_ID)];
        this.xChain = this.avalanche.XChain();
        this.cChain = this.avalanche.CChain();
        this.info = this.avalanche.Info();
        this.keystore = this.avalanche.NodeKeys();
        this.xKeyChain = this.xChain.keyChain();
        this.cKeyChain = this.cChain.keyChain();
        this.bintools = BinTools.getInstance();
    }

    public async getUsers(): Promise<string[]> {
        return await this.keystore.listUsers();
    }

    public encodedString(plainText: string): string {
        return this.bintools.cb58Encode(Buffer.from(plainText));
    }

    public getUTXOIDs(
        utxoSet: UTXOSet,
        txid: string,
        outputType: number = AVMConstants.SECPXFEROUTPUTID_CODECONE,
        assetID: string
    ): string[] {
        const utxoids: string[] = utxoSet.getUTXOIDs();
        let result: string[] = [];
        console.log(`--- UTXOIDs length: ${utxoids.length} ---`);
        for (let index: number = 0; index < utxoids.length; ++index) {
            if (utxoids[index].indexOf(txid.slice(0, 10)) != -1) {
                console.log(`--- UXT0IDs Find \n - TxID: ${txid}\n - AssetId: ${assetID}\n - AssetType: ${outputType}\
                    \n - Cmp1: ${
                        utxoids[index].indexOf(txid.slice(0, 10)) != -1
                    }\
                    \n - Cmp2: ${
                        utxoSet
                            .getUTXO(utxoids[index])
                            .getOutput()
                            .getOutputID() == outputType
                    }\
                    \n - Cmp3: ${
                        assetID ==
                        this.bintools.cb58Encode(
                            utxoSet.getUTXO(utxoids[index]).getAssetID()
                        )
                    }`);
                console.log(utxoids[index]);
            }
            if (
                utxoids[index].indexOf(txid.slice(0, 10)) != -1 &&
                utxoSet.getUTXO(utxoids[index]).getOutput().getOutputID() ==
                    outputType &&
                assetID ==
                    this.bintools.cb58Encode(
                        utxoSet.getUTXO(utxoids[index]).getAssetID()
                    )
            ) {
                result.push(utxoids[index]);
            }
        }
        return result;
    }

    public async createUser(
        username: string,
        password: string
    ): Promise<boolean> {
        return await this.keystore.createUser(
            username,
            this.encodedString(password)
        );
    }

    public async createAddress(
        username: string,
        password: string
    ): Promise<{
        xChain: string;
        cChain: string;
    }> {
        const encoded: string = this.encodedString(password);
        const xChain: string = await this.xChain.createAddress(
            username,
            encoded
        );
        const privateKey: string = await this.xChain.exportKey(
            username,
            encoded,
            xChain
        );
        const cChain: string = await this.cChain.importKey(
            username,
            encoded,
            privateKey
        );

        return {
            xChain,
            cChain,
        };
    }

    public async cChainExportKey(
        username: string,
        password: string,
        address: string
    ): Promise<string> {
        return await this.cChain.exportKey(
            username,
            this.encodedString(password),
            address
        );
    }

    public async cChainImportKey(
        username: string,
        password: string,
        privateKey: string
    ): Promise<string> {
        return this.cChain.importKey(
            username,
            this.encodedString(password),
            privateKey
        );
    }

    public async waitTx(txId) {
        let iters = 0;
        do {
            const status = await this.xChain.getTxStatus(txId);
            if (status !== "Processing") {
                return status;
            }
            await this.sleep(1000);
            iters++;
        } while (iters < 300);
        throw new Error("Still processing after five minutes, timeout");
    }

    public async xChainExportKey(
        username: string,
        password: string,
        address: string
    ): Promise<string> {
        return await this.xChain.exportKey(
            username,
            this.encodedString(password),
            address
        );
    }

    public async xChainImportKey(
        username: string,
        password: string,
        privateKey: string
    ): Promise<string> {
        return await this.xChain.importKey(
            username,
            this.encodedString(password),
            privateKey
        );
    }

    public async deleteUser(
        username: string,
        password: string
    ): Promise<boolean> {
        return await this.keystore.deleteUser(
            username,
            this.encodedString(password)
        );
    }

    public async getTxFee(): Promise<any> {
        return await this.info.getTxFee();
    }

    public async sendAvax(xUserTo: string, fee: string): Promise<string> {
        const avaxAssetID: string = this.defaultNetwork.X["avaxAssetID"];
        const memo: Buffer = Buffer.from(`Send AVAX to ${xUserTo}`);
        this.xKeyChain.importKey(this.privateKey);
        const txFee: any = await this.info.getTxFee();
        const avmUTXOResponse: any = await this.xChain.getUTXOs([
            this.adminAddress,
        ]);
        const utxoset: UTXOSet = avmUTXOResponse.utxos;
        const unsignedTx: UnsignedTx = await this.xChain.buildBaseTx(
            utxoset,
            txFee[fee],
            avaxAssetID,
            [xUserTo],
            [this.adminAddress],
            [this.adminAddress],
            memo,
            UnixNow(),
            new BN(0),
            1
        );
        const signedTx: Tx = unsignedTx.sign(this.xKeyChain);
        return await this.xChain.issueTx(signedTx);
    }

    public async getAvaxBalance(address: string): Promise<BN> {
        const avaxAssetID: string = this.defaultNetwork.X["avaxAssetID"];
        const responseBalance: any = await this.xChain.getBalance(
            address,
            avaxAssetID
        );
        return new BN(responseBalance.balance);
    }

    public async sleep(ms: number): Promise<unknown> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public async createNFT(
        username: string,
        password: string,
        minter: string,
        name: string,
        copies: number
    ): Promise<any> {
        const memo: Buffer = Buffer.from(`Create ${name} NFT-family`);
        const encoded: string = this.encodedString(password);
        const privateKey: string = await this.xChain.exportKey(
            username,
            encoded,
            minter
        );
        this.xKeyChain.importKey(privateKey);
        const avmUTXOResponse: any = await this.xChain.getUTXOs([minter]);
        const utxoset: UTXOSet = avmUTXOResponse.utxos;
        const unsignedTx: UnsignedTx = await this.xChain.buildCreateNFTAssetTx(
            utxoset,
            [minter],
            [minter],
            Array(copies).fill(new MinterSet(1, [minter])),
            this.bintools.cb58Encode(Buffer.from(name)),
            "FNFT",
            memo,
            UnixNow(),
            new BN(0)
        );
        const signedTx: Tx = unsignedTx.sign(this.xKeyChain);
        return await this.xChain.issueTx(signedTx);
    }

    public async mintNFT(
        username: string,
        password: string,
        minter: string,
        assetid: string,
        txID: string,
        userTo: string,
        payload: any,
        groupID: number
    ): Promise<any> {
        const memo: Buffer = Buffer.from(
            `Mint token ${assetid} and send to ${userTo}`
        );
        const encoded: string = this.encodedString(password);
        const privateKey: string = await this.xChain.exportKey(
            username,
            encoded,
            minter
        );
        this.xKeyChain.importKey(privateKey);
        const start = new Date();
        const allutxosResponses: avmUTXOResponseT[] = [];
        for (let i = 0; i < 32; i++) {
            const last = allutxosResponses[allutxosResponses.length - 1];
            const response = await this.xChain.getUTXOs(
                [minter],
                this.xKeyChain.chainid,
                1024,
                last ? last.endIndex : undefined
            );
            //Sign that got all UTXOs
            // Nice types bro! `(property) numFetched: number`
            if (Number(response.numFetched) === 0) {
                break;
            }
            // TODO: Use real deep equals
            if (last && deepEqualsBad(last.endIndex, response.endIndex)) {
                console.log(`same index can exit ealry`);
                break;
            }
            allutxosResponses.push(response);
        }
        const end = new Date();
        // Just to be extra shure
        const numFetched = allutxosResponses.map((e) => Number(e.numFetched));
        const nTotal = numFetched.reduce((acc, cv) => acc + cv, 0);
        const txt = numFetched.map((e, i) => ` - [${i}]=${e}`).join("\n");
        console.log(
            `--- [${
                end.getTime() - start.getTime()
            }ms] UXTOSets total fetched: ${nTotal}\n` +
                `AVG UTXO/req: ${nTotal / numFetched.length}, RPS: ${
                    numFetched.length /
                    ((end.getTime() - start.getTime()) / 1000)
                }\n` +
                `Details:\n${txt}`
        );
        // Merged UTXOSet off all the api responses
        const chungus = allutxosResponses
            .map((e) => e.utxos)
            .reduce((utxos, cv) => {
                utxos.addArray(cv.getAllUTXOs());
                return utxos;
            }, new UTXOSet());
        const utxoset: UTXOSet = chungus;
        const payloads: Buffer = new JSONPayload(payload).getPayload();
        const outputOwners: OutputOwners = new OutputOwners(
            [this.bintools.stringToAddress(userTo)],
            new BN(0),
            1
        );
        console.log(`--- Minter: ${minter} ---\n--- User to: ${userTo} ---\n`);
        const utxos: UTXO[] = utxoset.getAllUTXOs();
        let txid: Buffer = Buffer.from(assetid);
        let assetID: Buffer = Buffer.from(assetid);
        utxos.forEach((utxo: UTXO) => {
            if (utxo.getOutput().getTypeID() === 10) {
                txid = utxo.getTxID();
                assetID = utxo.getAssetID();
            }
        });
        const nftMintOutputUTXOIDs: string[] = this.getUTXOIDs(
            utxoset,
            assetid,
            AVMConstants.NFTMINTOUTPUTID,
            assetid
        );
        console.log(nftMintOutputUTXOIDs[0]);
        console.log(`Mint: ${nftMintOutputUTXOIDs.length}`);
        const nftMintOutputUTXOID: string = nftMintOutputUTXOIDs[0];
        const unsignedTx: UnsignedTx = await this.xChain.buildCreateNFTMintTx(
            utxoset,
            outputOwners,
            [minter],
            [minter],
            nftMintOutputUTXOID,
            groupID - 1,
            payloads,
            memo,
            UnixNow()
        );
        const signedTx: Tx = unsignedTx.sign(this.xKeyChain);
        return await this.xChain.issueTx(signedTx);
    }

    public async sendNFT(
        username: string,
        password: string,
        xUserFrom: string,
        xUserTo: string,
        assetid: any,
        txID: any
    ): Promise<any> {
        const memo: Buffer = Buffer.from(
            `Send NFT asset from ${xUserFrom} to ${xUserTo}`
        );
        console.log(`Send NFT asset from ${xUserFrom} to ${xUserTo}`);
        const encoded: string = this.encodedString(password);
        const privateKey: string = await this.xChain.exportKey(
            username,
            encoded,
            xUserFrom
        );
        this.xKeyChain.importKey(privateKey);
        const start = new Date();
        const allutxosResponses: avmUTXOResponseT[] = [];
        for (let i = 0; i < 32; i++) {
            const last = allutxosResponses[allutxosResponses.length - 1];
            const response = await this.xChain.getUTXOs(
                [xUserFrom],
                this.xKeyChain.chainid,
                1024,
                last ? last.endIndex : undefined
            );
            //Sign that got all UTXOs
            // Nice types bro! `(property) numFetched: number`
            if (Number(response.numFetched) === 0) {
                break;
            }
            // TODO: Use real deep equals
            if (last && deepEqualsBad(last.endIndex, response.endIndex)) {
                console.log(`same index can exit ealry`);
                break;
            }
            allutxosResponses.push(response);
        }
        const end = new Date();
        // Just to be extra shure
        const numFetched = allutxosResponses.map((e) => Number(e.numFetched));
        const nTotal = numFetched.reduce((acc, cv) => acc + cv, 0);
        const txt = numFetched.map((e, i) => ` - [${i}]=${e}`).join("\n");
        console.log(
            `--- [${
                end.getTime() - start.getTime()
            }ms] UXTOSets total fetched: ${nTotal}\n` +
                `AVG UTXO/req: ${nTotal / numFetched.length}, RPS: ${
                    numFetched.length /
                    ((end.getTime() - start.getTime()) / 1000)
                }\n` +
                `Details:\n${txt}`
        );
        // Merged UTXOSet off all the api responses
        const chungus = allutxosResponses
            .map((e) => e.utxos)
            .reduce((utxos, cv) => {
                utxos.addArray(cv.getAllUTXOs());
                return utxos;
            }, new UTXOSet());
        const utxoset: UTXOSet = chungus;
        const utxos: UTXO[] = utxoset.getAllUTXOs();
        let txid: Buffer = Buffer.from(txID);
        let assetID: Buffer = Buffer.from(assetid);
        utxos.forEach((utxo: UTXO) => {
            if (utxo.getOutput().getTypeID() === 11) {
                txid = utxo.getTxID();
                assetID = utxo.getAssetID();
            }
        });
        const nftTransferOutputUTXOIDs: string[] = this.getUTXOIDs(
            utxoset,
            txID,
            AVMConstants.NFTXFEROUTPUTID,
            assetid
        );
        console.log(`Send: ${nftTransferOutputUTXOIDs.length}`);

        if (!nftTransferOutputUTXOIDs.length) {
            console.log("-----TRACE------");
            // console.log({utxos});
            // console.log({utxoset});
            throw new Error("No output uxtoids");
        }
        const nftTransferOutputUTXOID: string =
            nftTransferOutputUTXOIDs[nftTransferOutputUTXOIDs.length - 1];
        const unsignedTx: UnsignedTx = await this.xChain.buildNFTTransferTx(
            utxoset,
            [xUserTo],
            [xUserFrom],
            [this.adminAddress],
            nftTransferOutputUTXOID,
            memo,
            UnixNow(),
            new BN(0),
            1
        );
        const signedTx: Tx = unsignedTx.sign(this.xKeyChain);
        return await this.xChain.issueTx(signedTx);
    }

    public async checkAccept(
        txID: string
    ): Promise<any> {
        return await this.xChain.getTxStatus(txID);
    }
}

export default AvalancheApi;
