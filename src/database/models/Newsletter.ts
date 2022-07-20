import {
    Table,
    Column,
    Model,
    PrimaryKey,
    AllowNull,
} from "sequelize-typescript";
import { Optional, DataTypes } from "sequelize";

interface INewsLetter {
    id: number;
    email: string;
}
interface INewsLetterAttributes extends Optional<INewsLetter, "id"> {}

@Table({
    timestamps: false,
    freezeTableName: true,
    tableName: "newsletter",
    underscored: true,
    modelName: "NewsLetter",
})
export default class NewsLetter
    extends Model<INewsLetter, INewsLetterAttributes>
    implements INewsLetter
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
    public email!: string;
}
