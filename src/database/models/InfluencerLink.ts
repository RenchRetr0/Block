import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
    HasMany,
    Unique,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";
import InfluencerTarget from "./InfluencerTarget";

interface InfluencerLinkAttributes {
    id: number;
    link: string;
}

interface InfluencerLinkCreationAttributes
    extends Optional<InfluencerLinkAttributes, "id"> {}

@Table({
    timestamps: true,
    freezeTableName: true,
    tableName: "influencer_link",
    underscored: true,
    modelName: "InfluencerLink",
})
export default class InfluencerLink
    extends Model<InfluencerLinkAttributes, InfluencerLinkCreationAttributes>
    implements InfluencerLinkAttributes
{
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataTypes.BIGINT,
        autoIncrement: true,
    })
    public id!: number;

    @AllowNull(true)
    @Unique(true)
    @Column({
        type: DataTypes.STRING(100),
    })
    public link: string;

    @HasMany(() => InfluencerTarget)
    public targets: InfluencerTarget[];
}
