import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
    BelongsTo,
    Default,
    HasMany,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";
import EventModel from "./Events";
import Wallet from "./Wallet";
import NftBalance from "./NftBalance";

interface TicketAttributes {
    id: number;
    name: string;
    price: number;
    currency: string;
    description: string;
    banner: string;
    copies: number;
    royalty: number;
    bonus: string;
    features: string;
    minted: number;
    EventModelId: number;
    TicketAssetId: string;
    walletId: number;
}
interface TicketCreationAttributes extends Optional<TicketAttributes, "id"> {}

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "ticket",
    underscored: true,
    modelName: "Ticket",
    paranoid: true,
})
export default class Ticket
    extends Model<TicketAttributes, TicketCreationAttributes>
    implements TicketAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    public name!: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    royalty: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public price: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    public currency: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.TEXT,
    })
    public description: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(256),
    })
    public banner: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    copies: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.TEXT,
    })
    bonus: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.TEXT,
    })
    features: string;

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataTypes.BIGINT,
    })
    minted: number;

    @ForeignKey(() => EventModel)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public EventModelId: number;

    public static async prepare(): Promise<Ticket> {
        return Ticket.sync();
    }

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(100),
    })
    TicketAssetId: string;

    @ForeignKey(() => Wallet)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    walletId: number;

    @BelongsTo(() => Wallet)
    wallet: Wallet;

    @BelongsTo(() => EventModel)
    event: EventModel;

    @HasMany(() => NftBalance, "tokenId")
    balances: NftBalance[];
}
