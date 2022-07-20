import EventModel from "../database/models/Events";
import User from "../database/models/User";
import EventApi from "./event-api";
import { HTTPStatus } from "../utils";

async function main() {
  const eventApi = new EventApi();
  // Hardcoded email for now, we should rewrite this as a unit test
  // Not like some random scriptr
  
  // Mishin test acc
  const inviter = await User.findByPk(238);
  // Super party test event
  const event = await EventModel.findByPk(104);
  // random test email
  const newUser = await eventApi.createNewUser('tofobiy371@fretice.com', inviter, event);
  console.log(newUser.toJSON());
}


// main()
//   .then(() => process.exit(0))
//   .catch(err => {
//     console.error(err);
//     process.exit(1);
//   });

const XOR = (a: any, b: any) => Number(Boolean(a)) ^ Number(Boolean(b));

// Small refactor of lazyFinaly with rest callback parameter
type callbackT = (...args: any) => any;
function lazyFinaly<T extends callbackT>(...a: Array<T>): ReturnType<T> {
    try {
        return a[0]();
    } catch (e) {
        return (a.length > 1) ? lazyFinaly(a.shift()) : a[0]();
    }
}

// lazyFinaly(
//     () => [
//         Math.floor(2.12),
//         appAssert(XOR(1, 1), 'Message', HTTPStatus.E_BAD_GATEWAY),
//         appAssert(XOR(1, 0), 'Message 2', HTTPStatus.E_BAD_GATEWAY),
//         appAssert(XOR(0, 1), 'Message 3', HTTPStatus.E_BAD_GATEWAY),
//     ]
// );
