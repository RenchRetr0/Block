import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    Unique,
    BelongsToMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";
import Employee from "./Employee";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "company",
    underscored: true,
    modelName: "Company",
})
export default class Company extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(false)
    @Unique(true)
    @Column({
        type: DataTypes.STRING(255),
    })
    companyName: string;

    @BelongsToMany(() => User, () => Employee)
    users: User[];
}
