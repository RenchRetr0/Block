import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import CircleContributors from "./CircleContributors";

@Table({
    freezeTableName: true,
    timestamps: false,
    tableName: "circle_permissions",
    underscored: true,
    modelName: "CirclePermissions",
})
export default class CirclePermissions extends Model {
    @AllowNull(false)
    @PrimaryKey
    @Column({
        type: DataTypes.INTEGER,
    })
    id: number;

    @Column({
        type: DataTypes.STRING(256),
    })
    permission: string;

    @HasMany(() => CircleContributors)
    circles: CircleContributors[];
}
