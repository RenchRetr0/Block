import {
    AllowNull,
    BelongsTo,
    Column,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    Default,
} from "sequelize-typescript";
import { DataTypes, Optional } from "sequelize";
import Wallet from "./Wallet";
import Ticket from "./Ticket";
import User from "./User";

interface NftBalanceAttributes {
    id: number;
    walletId: number;
    tokenId: number;
    txid: string;
    isPublic?: boolean;
    groupId?: number;
    verified: boolean;
    verifiedAt: Date;
    reVerified: boolean;
    reVerifiedAt: Date;
    verifyOwnerId: number;
}

interface NftBalanceCreationAttributes
    extends Optional<NftBalanceAttributes, "id"> {}

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "nft_balance",
    underscored: true,
    modelName: "NftBalance",
    paranoid: true,
})
export default class NftBalance
    extends Model<NftBalanceAttributes, NftBalanceCreationAttributes>
    implements NftBalanceAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @ForeignKey(() => Wallet)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    walletId: number;

    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    tokenId: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    txid: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    isPublic: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.INTEGER,
    })
    groupId: number;

    @BelongsTo(() => Ticket)
    tickets: Ticket;

    @BelongsTo(() => Wallet)
    wallet: Wallet;

    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    verified: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.DATE,
    })
    verifiedAt: Date;

    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    reVerified: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.DATE,
    })
    reVerifiedAt: Date;

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public verifyOwnerId: number;

    @BelongsTo(() => User)
    verifyOwner: User;
}
