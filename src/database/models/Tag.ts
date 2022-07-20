import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    BelongsToMany,
    HasMany,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";
import EventModel from "./Events";
import EventTags from "./EventTags";

interface TagAttributes {
    id: number;
    name: string;
}
interface TagCreationAttributes extends Optional<TagAttributes, "id"> {}

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "tags",
    underscored: true,
    modelName: "Tag",
})
export default class Tag
    extends Model<TagAttributes, TagCreationAttributes>
    implements TagAttributes
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
    @BelongsToMany(() => EventModel, () => EventTags)
    eventModel: EventModel;

    @HasMany(() => EventTags)
    eventTags: EventTags[];

    public static async prepare(): Promise<Tag> {
        // TODO: Probaly shouldn't be timesapmed
        return Tag.sync();
    }
}
