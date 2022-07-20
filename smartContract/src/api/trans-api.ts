import dotenv from "dotenv";
import CustomError from "../CustomError";
import { Op, Sequelize } from "sequelize";
import sequelize from "../database/sequelize";
import hre from "hardhat";
import Contract from "../database/models/Contract";
const ethers = hre.ethers;
import MFT from "../../artifacts/contracts/MyFirstToken.sol/MyFirstToken.json";
dotenv.config();

export default class TransApi {

    sequelize: Sequelize;

    constructor() {
        this.sequelize = sequelize;
    }

    public static async Mint(options: { token: any, tokens: number;}) : Promise<any> {
        try {
            const {token, tokens} = options;
            const values = tokens * 1000;
            const address = token.verify.user.address;

            if (!values || !token) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            const account = await this.Account(address);
            const balancesUp = await this.Contract(account);

            await balancesUp.mint(account.address, values);
            const result = await balancesUp.balancesOf(account.address) / 1000;

            return {
                status: 201,
                message: `Баланс: ${result}`,
            };
        }
        catch(e) {
            throw e;
        }
    }

    public static async Smart(address: string) : Promise<string> {
        try {
            if (!address) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            const account = await this.Account(address);

            const smart = await ethers.getContractFactory('MyFirstToken', account);
            const contract = await smart.deploy();
            const deployTx = await contract.deployed();

            return deployTx.address;
        }
        catch(e) {
            throw e;
        }
    }

    public static async ballance(options: { token: any }) : Promise<any> {
        try {
            const {token} = options;
            const address = token.verify.user.address;

            if (!token) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }
            
            const account = await this.Account(address);
            const balances = await this.Contract(account);

            const result = await balances.balancesOf(account.address) / 1000;

            return {
                status: 201,
                message: `Ваш баланс: ${result}`,
            };
        }
        catch(e) {
            throw e;
        }
    }

    public static async transaction(option: {token: any, to: string, tokens: number}) : Promise<any> {
        try {
            const {token, to, tokens} = option;
            const from = token.verify.user.address;

            if (!from || !to || !tokens) {
                throw new CustomError({
                    status: 400,
                    message: "All parameters are required.",
                });
            }

            const owner_values = Math.ceil(tokens * 0.1) * 1000;
            const value = tokens * 1000 - owner_values;
            console.log(value);

            const _from = await this.Account(from);
            const _to = await this.Account(to);

            const transfersContract = await this.Contract(_from);

            await transfersContract.transfer(_to.address, owner_values, value);

            const result = await transfersContract.balancesOf(_from.address) / 1000;

            return {
                status: 201,
                message: `Ваш баланс: ${result}.`,
            };
        }
        catch(e) {
            throw e;
        }
    }

    private static async Account(address: string) : Promise<any> {
        const account = await ethers.getSigner(address);
        return account;
    }

    private static async Contract(address: any) : Promise<any> {

        const smart = await Contract.findOne({
            where: {
                id: 1
            }
        });

        const contract = new ethers.Contract(
            smart.smart,
            MFT.abi,
            address
        );
        
        return contract;
    }
}
