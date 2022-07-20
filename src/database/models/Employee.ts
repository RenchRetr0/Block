import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";
import Company from "./Company";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "employee",
    underscored: true,
    modelName: "Employee",
})
export default class Employee extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    userId: number;

    @ForeignKey(() => Company)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
    })
    companyId: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255),
    })
    position: string;
}
