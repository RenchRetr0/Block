import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import EventContributors from "./EventContributors";

@Table({
    freezeTableName: true,
    timestamps: false,
    tableName: "event_permissions",
    underscored: true,
    modelName: "EventPermissions",
})
export default class EventPermissions extends Model {
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

    @HasMany(() => EventContributors)
    events: EventContributors[];
}
