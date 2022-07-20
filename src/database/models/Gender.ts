import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasOne,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Profile from "./Profile";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "gender",
    underscored: true,
    modelName: "Gender",
})
export default class Gender extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING,
    })
    gender: string;

    @HasOne(() => Profile)
    profile: Profile;
}