import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";
import EventModel from "./Events";
import Tag from "./Tag";

interface EventTagsAttributes {
    id: number;
    EventModelId: number;
    TagId: number;
}
interface EventTagsCreationAttributes
    extends Optional<EventTagsAttributes, "id"> {}

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "event_tags",
    underscored: true,
    modelName: "EventTags",
})
export default class EventTags
    extends Model<EventTagsAttributes, EventTagsCreationAttributes>
    implements EventTagsAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @ForeignKey(() => EventModel)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public EventModelId: number;

    @ForeignKey(() => Tag)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public TagId: number;

    public static async prepare(): Promise<EventTags> {
        return EventTags.sync();
    }
}
