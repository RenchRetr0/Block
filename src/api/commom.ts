import CustomError from "../CustomError";
import Circle from "../database/models/Circle";
import User from "../database/models/User";
import EventModel from "../database/models/Events";
import {Op} from 'sequelize';

const mkFn = <T>(model, modelName) => {
    return async function (id: string | number, options: any = {}): Promise<T> {
        let ret;
        const asNum = Number(id);
        if (!Number.isNaN(asNum)) {
            ret = await model.findByPk(id, options);
        } else if (typeof id === "string") {
            ret = await model.findOne({
                ...options,
                where: {
                    shortLink: {
                        [Op.iLike]: `%${id.toLowerCase()}%`
                    },
                },
            });
        }

        if (!ret) {
            throw new CustomError({
                status: 404,
                message: `${modelName} with id: ${id} not found`,
            });
        }

        return ret;
    };
};

export const tryGetCircle = mkFn<Circle>(Circle, "Circle");
export const tryGetUser = mkFn<User>(User, "User");
export const tryGetEvent = mkFn<EventModel>(EventModel, "EventModel");

export const appAssert = (cmp: any, message: string, status = 500) => {
    if (!cmp) {
        throw new CustomError({
            message,
            status,
        });
    }
};
