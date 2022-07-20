import {
    Table,
    Column,
    Model,
    AllowNull,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";
import EventModel from "./Events";
import EventPermissions from "./EventPermissions";

@Table({
    freezeTableName: true,
    timestamps: false,
    tableName: "event_contributors",
    underscored: true,
    modelName: "EventContributors",
})
export default class EventContributors extends Model {
    @ForeignKey(() => EventModel)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    eventId: number;

    @BelongsTo(() => EventModel)
    event: EventModel;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => EventPermissions)
    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER,
    })
    event_permissionId: number;

    @BelongsTo(() => EventPermissions)
    event_permissions: EventPermissions;
}
