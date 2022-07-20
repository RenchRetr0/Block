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
import EventModel from "./Events";
import Ticket from "./Ticket";
import InfluencerLink from "./InfluencerLink";

interface InfluencerTargetAttributes {
    id: number;
    eventId: number;
    ticketId: number;
    influencerLinkId: number;
}

interface InfluencerTargetCreationAttributes
    extends Optional<InfluencerTargetAttributes, "id"> {}

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "influencer_target",
    underscored: true,
    modelName: "InfluencerTarget",
})
export default class InfluencerTarget extends Model /*<InfluencerTargetAttributes, InfluencerTargetCreationAttributes> implements InfluencerTargetAttributes*/ {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @ForeignKey(() => EventModel)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public eventId: number;

    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public ticketId: number;

    @ForeignKey(() => InfluencerLink)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public influencerLinkId: number;

    @BelongsTo(() => EventModel)
    public event: EventModel;

    @BelongsTo(() => Ticket)
    public ticket: Ticket;

    @BelongsTo(() => InfluencerLink)
    public influencerLink: InfluencerLink;
}
