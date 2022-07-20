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
import Verification from "./Verification";
import Wallet from "./Wallet";
import Company from "./Company";
import Employee from "./Employee";
import Profile from "./Profile";
import Circle from "./Circle";
import Like from "./Likes";
import EventModel from "./Events";
import Follow from "./Follow";
import { IEventCreator } from "../InterfaceDefenitions";
import Ticket from "./Ticket";
import NftBalance from "./NftBalance";
import bcrypt from "bcrypt";
import CircleContributors from "./CircleContributors";
import EventContributors from "./EventContributors";
import Paypal from './Paypal';

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "user",
    underscored: true,
    modelName: "User",
    paranoid: true,
})
export default class User extends Model implements IEventCreator {
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
        type: DataTypes.STRING
    })
    email: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    password: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    fullName: string;

    @AllowNull(true)
    @Unique(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    shortLink: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    newsLetter: boolean;

    @ForeignKey(() => Wallet)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    walletId: number;

    @BelongsTo(() => Wallet)
    wallet: Wallet;

    @ForeignKey(() => Verification)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    verificationId: number;

    @BelongsTo(() => Verification)
    verification: Verification;

    @BelongsToMany(() => Company, () => Employee)
    companies: Company[];

    @ForeignKey(() => Profile)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    profileId: number;

    @BelongsTo(() => Profile)
    profile: Profile;

    @HasMany(() => Circle)
    circle: Circle[];

    @HasMany(() => Like)
    likes: Like[];

    @HasMany(() => EventModel, {
        foreignKey: "organizerId",
    })
    events: EventModel[];

    @HasMany(() => Follow, {
        foreignKey: "fromUserId",
    })
    following: Follow[];

    @HasMany(() => Follow, {
        foreignKey: "toUserId",
    })
    followers: Follow[];

    @Column({
        type: DataTypes.FLOAT,
    })
    fiat_summ: number;

    @Column({
        type: DataTypes.FLOAT,
    })
    crypto_summ: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    can_royalty: boolean;

    @AllowNull(true)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    isGoogle: boolean;

    @AllowNull(true)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN
    })
    isFacebook: boolean;

    @AllowNull(true)
    @Default(true)
    @Column({
        type: DataTypes.BOOLEAN
    })
    FlashBsPrivate: boolean;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    registeredFrom: string;

    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN
    })
    merchantAgree: boolean;

    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN
    })
    followersIsPrivate: boolean;

    @ForeignKey(() => Paypal)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    paypalId: number;

    @BelongsTo(() => Paypal)
    paypal: Paypal;


    @HasMany(() => CircleContributors, "userId")
    circle_contributors: CircleContributors[];

    @HasMany(() => EventContributors, "userId")
    eventContributors: EventContributors[];

    @HasMany(() => NftBalance, "verify_owner_id")
    verified_tickets: NftBalance[];

    public getFollowing!: HasManyGetAssociationsMixin<Follow>; // Note the null assertions!

    public getFollowers!: HasManyGetAssociationsMixin<Follow>; // Note the null assertions

    public countFollowers!: HasManyCountAssociationsMixin; // Note the null assertions

    public getWallet!: HasOneGetAssociationMixin<Wallet>;
    public getCircle!: HasOneGetAssociationMixin<Circle>;

    public async getWalletCredentials() {
        const wallet = await this.getWallet();
        return {
            username: wallet.username,
            password: this.password,
        };
    }

    @BeforeDestroy({})
    public static async softDelete(instance, options) {
        const user: User = await User.findOne({
            where: {
                id: instance.id,
            },
            include: [
                Wallet,
                Like,
                {
                    model: Circle,
                    include: [EventModel, Wallet],
                },
                Profile,
                Verification,
            ],
            paranoid: false,
        });
        console.log(user);
        if (user?.circle) {
            user.circle.map(async (circle: Circle) => {
                await EventModel.destroy({
                    where: {
                        COrganizerId: circle.id,
                    },
                    force: false,
                });
                await Ticket.destroy({
                    where: {
                        walletId: circle.walletId,
                    },
                    force: false,
                });

                await circle.wallet.destroy({
                    force: false,
                });

                await circle.update({
                    shortLink: null,
                });

                await circle.destroy({
                    force: false,
                });
            });
        }

        if (user?.profile) {
            await user.profile.destroy({
                force: false,
            });
        }

        await EventModel.destroy({
            where: {
                organizerId: user.id,
            },
            force: false,
        });

        await Ticket.destroy({
            where: {
                walletId: user.walletId,
            },
            force: false,
        });

        await Like.destroy({
            where: {
                userId: user.id,
            },
        });

        await Follow.destroy({
            where: {
                fromUserId: user.id,
            },
        });

        await NftBalance.destroy({
            where: {
                walletId: user.walletId,
            },
        });

        await user.verification.destroy({
            force: false,
        });

        await user.wallet.destroy({
            force: false,
        });

        await user.update({
            email: await bcrypt.hash(user.email, 15),
            shortLink: null,
        });
    }
}
