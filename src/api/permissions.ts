import CustomError from "../CustomError";
import Circle from "../database/models/Circle";
import CircleContributors from "../database/models/CircleContributors";
import EventContributors from "../database/models/EventContributors";
import EventModel from "../database/models/Events";
import User from "../database/models/User";
import { tryGetCircle } from "./commom";

export enum EPERM {
    ADMIN = 1,
    EDITOR = 2,
    TICKET_CTRL = 3,
    OWNER = 4,
}

export async function checkUserPermsForCircle(
    circle: Circle,
    user: User,
    perm: EPERM
) {
    const initiatorPerms = await CircleContributors.findOne({
        where: {
            userId: user.id,
            circleId: circle.id,
        },
    });

    const permClearance =
        initiatorPerms && initiatorPerms.circle_permissionId <= perm;

    if (circle.organizerId !== user.id && !permClearance) {
        throw new CustomError({
            status: 403,
            message: "You cannot edit current circle",
        });
    }
}

export async function checkUserPermsForEvent(
    event: EventModel,
    user: User,
    perm: EPERM
) {
    const initiatorPerms = await EventContributors.findOne({
        where: {
            userId: user.id,
            eventId: event.id,
        },
    });

    const permClearance =
        initiatorPerms && initiatorPerms.event_permissionId <= perm;

    if (event.organizerId !== user.id && !permClearance) {
        // If not in event contributors, fallback to cirlce contrbutors

        // If event not belongs to a circle, dont even bother;
        if (!event.COrganizerId) {
            throw new CustomError({
                status: 403,
                message: "You don't have enough access to edit this",
            });
        }

        // Either of thees will throw an error if something goes wrong
        const cirlce = await tryGetCircle(event.COrganizerId);
        await checkUserPermsForCircle(cirlce, user, perm);
    }
}
