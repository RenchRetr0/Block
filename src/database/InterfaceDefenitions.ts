import Wallet from "./models/Wallet";

export interface IWalletOwner {
    wallet: Wallet;
    /**
     * Get wallet credetnials
     * @returns Avalache api ready wallet credentials
     */
    getWalletCredentials: () => Promise<{
        username: string;
        password: string;
        apiPassword?: string;
    }>;
}

export interface IEventCreator extends IWalletOwner {
    can_royalty: boolean;
    crypto_summ: number;
    fiat_summ: number;
}
