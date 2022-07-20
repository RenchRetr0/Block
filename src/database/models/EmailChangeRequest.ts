import {
    Table,
    Column,
    Model,
    PrimaryKey,
    ForeignKey,
    AllowNull,
    HasOne, HasMany, BelongsToMany, BelongsTo, Default
} from 'sequelize-typescript';
import {DataTypes} from 'sequelize';
import User from './User';

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: 'email_change_requests',
    underscored: true,
    modelName: 'EmailChangeRequests',
    paranoid: false
})

export default class EmailChangeRequests extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
      type: DataTypes.BIGINT,
      autoIncrement: true
    })
    public id!: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.INTEGER
    })
    public changeCode: number

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(100)
    })
    public cancleHash: string

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING
    })
    public newEmail: string

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING
    })
    public oldEmail: string

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT
    })
    public userId: number;

    @BelongsTo(() => User)
    public user: User;

    @AllowNull(true)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN
    })
    public resolved: boolean

    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT
    })
    public expires: number
}