import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasOne,
    HasMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";
import Ticket from "./Ticket";
import NftBalance from "./NftBalance";
import Circle from "./Circle";

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "wallet",
    underscored: true,
    modelName: "Wallet",
    paranoid: true,
})
export default class Wallet extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(100),
    })
    walletAddress: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(100),
    })
    cChainAddress: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    username: string;

    @HasOne(() => User)
    user: User;

    @HasOne(() => Circle, {
        onDelete: "cascade",
    })
    circle: Circle;

    @HasMany(() => Ticket, {
        onDelete: "cascade",
    })
    tickets: Ticket[];

    @HasMany(() => NftBalance, "wallet_id")
    balances: NftBalance[];
}
