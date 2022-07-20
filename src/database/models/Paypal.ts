import { DataTypes } from "sequelize";
import { AllowNull, BelongsTo, Column, HasOne, PrimaryKey, Table, Model } from "sequelize-typescript";
import Circle from "./Circle";
import User from "./User";

export interface IPaypal {
    id: number,
    access_token: string
    refresh_token: string
    payer_id: string,
    user?: User,
    circle?: Circle
}

@Table({
    modelName: "Paypal",
    underscored: true,
    tableName: "paypals",
    freezeTableName: true,
    timestamps: false
})
export default class Paypal extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
      type: DataTypes.BIGINT,
      autoIncrement: true
    })
    public id!: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING
    })
    public access_token: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING
    })
    public refresh_token: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING
    })
    public payer_id: string;

    @HasOne(() => User)
    user: User;

    @HasOne(() => Circle)
    circle: Circle;
}