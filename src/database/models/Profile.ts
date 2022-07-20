import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasOne,
    HasMany,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import User from "./User";
import Interest from "./Interest";
import Gender from "./Gender";

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "profile",
    underscored: true,
    modelName: "Profile",
    paranoid: true,
})
export default class Profile extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(255),
    })
    location: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(255),
    })
    banner: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(25),
    })
    phone: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(255),
    })
    avatar: string;

    @HasOne(() => User)
    user: User;

    @HasMany(() => Interest)
    interests: Interest[];

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    instagram: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    twitter: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    website: string;

    @ForeignKey(() => Gender)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    genderId: number;

    @BelongsTo(() => Gender)
    public gender: Gender;

    @AllowNull(true)
    @Column({
        type: DataTypes.DATEONLY,
    })
    birthday: Date;
}
