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
import EventTags from "./EventTags";
import User from "./User";

interface LikeAttributes {
    id: number;
    userId: number;
    eventId: number;
}
interface LikeAttributesAttributes extends Optional<LikeAttributes, "id"> {}

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "like",
    underscored: true,
    modelName: "Like",
})
export default class Like
    extends Model<LikeAttributes, LikeAttributesAttributes>
    implements LikeAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public userId!: number;

    @BelongsTo(() => User)
    public user: User;

    @ForeignKey(() => EventModel)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public eventId!: number;

    @BelongsTo(() => EventModel)
    public event: EventModel;
}
