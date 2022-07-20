import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Profile from "./Profile";

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "interest",
    underscored: true,
    modelName: "Interest",
})
export default class Interest extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    interest: string;

    @ForeignKey(() => Profile)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    profileId: number;

    @BelongsTo(() => Profile)
    profile: Profile;
}
