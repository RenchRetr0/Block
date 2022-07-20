import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";
import Wallet from "./Wallet";
import Ticket from "./Ticket";
import InfluencerTarget from "./InfluencerTarget";

interface PaymentAttributes {
    id: number;
    walletId: number;
    ticketId: number;
    influencerTargetId: number;
    service: string;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, "id"> {}

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "payment",
    underscored: true,
    modelName: "Payment",
})
export default class Payment
    extends Model<PaymentAttributes, PaymentCreationAttributes>
    implements PaymentAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @ForeignKey(() => Wallet)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public walletId: number;

    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public ticketId: number;

    @ForeignKey(() => InfluencerTarget)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public influencerTargetId: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    public service: string;

    @BelongsTo(() => Wallet)
    public wallet: Wallet;

    @BelongsTo(() => Ticket)
    public ticket: Ticket;

    @BelongsTo(() => InfluencerTarget)
    public influencerTarget: InfluencerTarget;
}
