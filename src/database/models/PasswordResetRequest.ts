import {
    Table,
    Column,
    Model,
    PrimaryKey,
    ForeignKey,
    AllowNull,
    BelongsTo,
    Default,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "password_reset_requests",
    underscored: true,
    modelName: "PasswordResetRequests",
    paranoid: false,
})
export default class PasswordResetRequests extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(100),
    })
    public resetHash: string;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    public userId: number;

    @BelongsTo(() => User)
    public user: User;

    @AllowNull(true)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    public reseted: boolean;
}
