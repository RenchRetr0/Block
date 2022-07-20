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
import User from "./User";
import Circle from "./Circle";

interface FollowTagsAttributes {
    id: number;
    fromUserId: number;
    circleId?: number;
    toUserId?: number;
}
interface FollowTagsCreationAttributes
    extends Optional<FollowTagsAttributes, "id"> {}

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "follow",
    underscored: true,
    modelName: "Follow",
})
export default class Follow
    extends Model<FollowTagsAttributes, FollowTagsCreationAttributes>
    implements FollowTagsAttributes
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
    public fromUserId: number;
    @BelongsTo(() => User, "fromUserId")
    public fromUser: User;

    @ForeignKey(() => Circle)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public circleId: number;

    @BelongsTo(() => Circle)
    public circle: Circle;

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public toUserId: number;

    @BelongsTo(() => User, "toUserId")
    public toUser: User;
}
