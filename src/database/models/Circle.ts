import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    ForeignKey,
    BelongsTo,
    BelongsToMany,
    HasMany,
    Unique,
    Default
} from 'sequelize-typescript';
import {DataTypes, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin} from 'sequelize';
import {CircleEventType} from './CircleEventType';
import User from './User';
import CircleEventInterval from './CircleEventInterval';
import Follow from './Follow';
import Wallet from './Wallet';
import EventModel from './Events';
import { BelongsToGetAssociationMixin } from 'sequelize';
import { BinTools, Buffer } from 'avalanche';
import { IEventCreator } from '../InterfaceDefenitions';
import Ticket from "./Ticket";
import CircleContributors from "./CircleContributors";
import Paypal from './Paypal';

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: 'circle',
    underscored: true,
    modelName: 'Circle',
    paranoid: true
})
export default class Circle extends Model implements IEventCreator {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true
    })
    id: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255)
    })
    circleName: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255)
    })
    country: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255)
    })
    city: string;

    @ForeignKey(() => CircleEventType)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT
    })
    eventTypeId: number;

    @BelongsTo(() => CircleEventType)
    eventType: CircleEventType;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(255)
    })
    contactPerson: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256)
    })
    contactEmail: string;

    @ForeignKey(() => CircleEventInterval)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT
    })
    eventIntervalId: number;
    
    @BelongsTo(() => CircleEventInterval)
    eventInterval: CircleEventInterval;
    
    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(256)
    })
    logo: string

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(256)
    })
    banner: string

    @AllowNull(true)
    @Unique(true)
    @Column({
        type: DataTypes.STRING(100)
    })
    shortLink: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.TEXT
    })
    bio: string;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT
    })
    organizerId: number;

    @ForeignKey(() => Wallet)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT
    })
    walletId: number;

    @BelongsTo(() => User)
    organizer: User;

    @HasMany(() => EventModel)
    events: EventModel[];

    @BelongsTo(() => Wallet)
    wallet: Wallet;
    
    @HasMany(() => Follow, {
        foreignKey: 'circleId'
    })
    followers: Follow[];
    
    @AllowNull(true)
    @Column({
        type: DataTypes.BOOLEAN
    })
    can_royalty: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100)
    })
    instagram: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100)
    })
    twitter: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100)
    })
    website: string;

    
    @Column({
        type: DataTypes.FLOAT
    })
    fiat_summ: number;

    @Column({
        type: DataTypes.FLOAT
    })
    crypto_summ: number;

    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN
    })
    followersIsPrivate: boolean;

    @HasMany(() => CircleContributors, 'circleId')
    circle_contributors: CircleContributors[];

    @ForeignKey(() => Paypal)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    paypalId: number;

    @BelongsTo(() => Paypal)
    paypal: Paypal;


    public getFollowers!: HasManyGetAssociationsMixin<Follow>; // Note the null assertions
    
    public getOrganizer!: BelongsToGetAssociationMixin<User>; // Note the null assertions
    
    public getWallet!: BelongsToGetAssociationMixin<Wallet>; // Note the null assertions
    
    public countFollowers!: HasManyCountAssociationsMixin; // Note the null assertions

    // NOTE: In some places it's unclear what password you want to use.
    //       When you want to interact directly with avalanchejs api use `apiPassword`,
    //       when you want to interact with internal (specific to *this* project)
    //       avalanche api wrapper use `password`.
    //       This happend because of some regretable descisions during creation wallets for cirlces
    //       thus ruining interchangeability of `User` and `Circle` entities during some operations 
    //       with avalanche blockchain. You are probably fine if use any of the methods provided in 
    //       `AvalancheApi` class, but if you going to use XChain (or any other) api directly,
    //       it's vital that you use `apiPassword` and not `password`

    public getEvents!: HasManyGetAssociationsMixin<EventModel>;

    public async getWalletCredentials() {
        const user = await this.getOrganizer();
        const password  = BinTools.getInstance().cb58Encode(Buffer.from(user.password));
        const apiPassword = BinTools.getInstance().cb58Encode(Buffer.from(password));
        const wallet = await this.getWallet();
        return {
            username: wallet.username,
            password: password,
            apiPassword
        }
    }
}
