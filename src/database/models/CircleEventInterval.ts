import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Circle from "./Circle";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "circle_event_intervals",
    underscored: true,
    modelName: "CircleEventIntervals",
})
export default class CircleEventInterval extends Model {
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
