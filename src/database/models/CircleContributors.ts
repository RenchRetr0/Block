import {
    Table,
    Column,
    Model,
    AllowNull,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Circle from "./Circle";
import User from "./User";
import CirclePermissions from "./CirclePermissions";

@Table({
    freezeTableName: true,
    timestamps: false,
    tableName: "circle_contributors",
    underscored: true,
    modelName: "CircleContributors",
})
export default class CircleContributors extends Model {
    @ForeignKey(() => Circle)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    circleId: number;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => CirclePermissions)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    circle_permissionId: number;

    @BelongsTo(() => CirclePermissions)
    circle_permissions: CirclePermissions;

    @BelongsTo(() => Circle)
    circle: Circle;
}
