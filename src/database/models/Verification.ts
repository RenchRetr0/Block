import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    Default,
    HasOne,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "verification",
    underscored: true,
    modelName: "Verification",
    paranoid: true,
})
export default class Verification extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255),
    })
    token: string;

    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    verified: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.DATE,
    })
    verifiedAt: Date;

    @HasOne(() => User)
    user: User;
}
