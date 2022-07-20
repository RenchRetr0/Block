import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    Unique,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    HasMany,
    BeforeDestroy,
    Default,
    HasOne
} from "sequelize-typescript";
import {
    DataTypes,
    HasManyCountAssociationsMixin,
    HasManyGetAssociationsMixin,
    HasOneGetAssociationMixin,
} from "sequelize";

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "user",
    underscored: true,
    modelName: "User",
    paranoid: true,
})
export default class User extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    id: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    login: string;

    @AllowNull(false)
    @Column({
        type:DataTypes.STRING(256),
    })
    address: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    password: string;

}
