import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "contract",
    underscored: true,
    modelName: "Contract",
})
export default class Contract extends Model {
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
    smart: string;
}