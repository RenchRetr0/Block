import {
    Optional,
    DataTypes,
    HasManyGetAssociationsMixin,
    HasManyAddAssociationMixin,
    HasManyHasAssociationMixin,
    HasManyCountAssociationsMixin,
    HasManyCreateAssociationMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyAddAssociationMixin,
    BelongsToManyCountAssociationsMixin,
    BelongsToManyHasAssociationMixin,
    BelongsToManyCreateAssociationMixin,
    BelongsToGetAssociationMixin,
} from "sequelize";
import {
    Table,
    Column,
    Model,
    PrimaryKey,
    Unique,
    AllowNull,
    HasMany,
    BelongsToMany,
    ForeignKey,
    BelongsTo,
    Default,
} from "sequelize-typescript";
import Circle from "./Circle";
import EventContributors from "./EventContributors";
import EventTags from "./EventTags";
import Like from "./Likes";
import Tag from "./Tag";
import Ticket from "./Ticket";
import User from "./User";

export interface iTimezone {
    gmtOffset: string;
    ianaTimezoneName: string;
}

interface EventAttributes {
    id: number;
    name: string;
    banner: string;
    description: string;
    shortLink: string;
    location: string;
    location_lat: number;
    location_lon: number;
    location_address: string;
    online_link: string;
    organizerId: number;
    startTime: Date;
    endTime: Date;
    timezone: string | iTimezone;
    /// Boolean -- is kyc required
    securityLevel: boolean;
    /// Boolean -- set if event is private
    eventTypeIsPrivate: boolean;
    COrganizerId: number;
    likesIsPrivate: boolean;
}

interface EventCreationAttributes extends Optional<EventAttributes, "id"> {}

// TODO: Poperly handle evnet organizer

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "events",
    underscored: true,
    modelName: "EventModel",
    paranoid: true,
})
export default class EventModel
    extends Model<EventAttributes, EventCreationAttributes>
    implements EventAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    public name!: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.STRING(256),
    })
    public banner: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.TEXT,
    })
    public description: string;

    @AllowNull(true)
    @Unique(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    public shortLink: string;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    public location: string;

    @AllowNull(true)
    @Column({
        type: DataTypes.TEXT,
    })
    public online_link: string;

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    public organizerId: number;

    @BelongsTo(() => User)
    public organizer: User;

    @AllowNull(false)
    @Column({
        type: DataTypes.DATE,
    })
    public startTime: Date;

    @AllowNull(false)
    @Column({
        type: DataTypes.DATE,
    })
    public endTime: Date;

    @AllowNull(false)
    @Column({
        type: DataTypes.STRING(256),
    })
    public timezone: string | iTimezone;

    @AllowNull(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    public securityLevel: boolean;

    @AllowNull(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    public eventTypeIsPrivate: boolean;

    @ForeignKey(() => Circle)
    @AllowNull(true)
    @Column({
        type: DataTypes.BIGINT,
    })
    COrganizerId: number;

    @BelongsTo(() => Circle)
    public circle: Circle;

    @AllowNull(true)
    @Column({
        type: DataTypes.DOUBLE,
    })
    public location_lat: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.DOUBLE,
    })
    public location_lon: number;

    @AllowNull(true)
    @Column({
        type: DataTypes.TEXT,
    })
    public location_address: string;
    
    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataTypes.BOOLEAN,
    })
    public likesIsPrivate: boolean;

    @HasMany(() => EventContributors)
    contributors: EventContributors[];

    // Since TS cannot determine model association at compile time
    // we have to declare them here purely virtually
    // these will not exist until `Model.init` was called.
    public getTickets!: HasManyGetAssociationsMixin<Ticket>; // Note the null assertions!
    public addTicket!: HasManyAddAssociationMixin<Ticket, number>;
    public hasTicket!: HasManyHasAssociationMixin<Ticket, number>;
    public countTickets!: HasManyCountAssociationsMixin;
    public createTicket!: HasManyCreateAssociationMixin<Ticket>;

    public getTags!: BelongsToManyGetAssociationsMixin<Tag>;
    public addTag!: BelongsToManyAddAssociationMixin<Tag, number>;
    public hasTag!: BelongsToManyHasAssociationMixin<Tag, number>;
    public countTags!: BelongsToManyCountAssociationsMixin;
    public createTag!: BelongsToManyCreateAssociationMixin<Tag>;

    public getCircle!: BelongsToGetAssociationMixin<Circle>;

    public getLikes!: BelongsToManyGetAssociationsMixin<Like>;
    public addLike!: BelongsToManyAddAssociationMixin<Like, number>;
    public hasLike!: BelongsToManyHasAssociationMixin<Like, number>;
    public countLikes!: BelongsToManyCountAssociationsMixin;
    public createLike!: BelongsToManyCreateAssociationMixin<Like>;

    // Returns true if tag was deleted, false if tag was not found
    public async removeTagByName(tagName: string): Promise<boolean> {
        const tag = await Tag.findOne({
            where: {
                name: tagName,
            },
        });
        if (!tag) {
            return false;
        }
        const eventTag = await EventTags.findOne({
            where: {
                TagId: tag.id,
                EventModelId: this.id,
            },
        });

        if (!eventTag) {
            return false;
        }

        await eventTag.destroy();
        return true;
    }

    public async addTagByName(tagName: string) {
        const tags = await Tag.findAll({
            where: {
                name: tagName,
            },
        });

        if (tags.length > 0) {
            await Promise.all(tags.map((e) => this.addTag(e)));
            return tags.length;
        }

        await this.createTag({ name: tagName });
        return 1;
    }
    // You can also pre-declare possible inclusions, these will only be populated if you
    // actively include a relation.
    @HasMany(() => Ticket, {
        foreignKey: "EventModelId",
    })
    public readonly tickets?: Ticket[]; // Note this is optional since it's only populated when explicitly requested in code
    @BelongsToMany(() => Tag, () => EventTags)
    public readonly tags?: Tag[];
    @HasMany(() => Like)
    public readonly likes?: Like[];

    @HasMany(() => EventTags)
    //public readonly __unused?: EventTags[];
    public static prepare() {
        return EventModel.sync();
    }
}
