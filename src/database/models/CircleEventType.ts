import {
    AllowNull,
    Column,
    HasMany,
    Model,
    PrimaryKey,
    Table,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Circle from "./Circle";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "circle_event_type",
    underscored: true,
    modelName: "CircleEventType",
})
export class CircleEventType extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    name: string;

    @HasMany(() => Circle)
    circles: Circle[];
}
