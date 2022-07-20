import { Sequelize } from "sequelize-typescript";
import { Dialect, Model } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize({
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    dialect: <Dialect>process.env.DB_DRIVER,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    models: [`${__dirname}/models/*.ts`],
});

export default sequelize;

// export const SyncModels = async () => {
//   const all = sequelize.modelManager.all;
//   const seen: typeof Model[] = [];
//
//   const syncRecursive = async (model: typeof Model) => {
//     if (seen.find(e => e === model))
//       return;
//
//     seen.push(model);
//
//     const associatedModels = Object.values(model.associations);
//     for (const assoc of associatedModels) {
//       if (assoc.associationType in ['HasMany','HasOne'])
//         continue;
//
//       await syncRecursive(assoc.target);
//     }
//
//     return await model.sync({ force: !!Number(process.env.DEV) })
//   }
//
//   for (const model of all) {
//     await syncRecursive(model);
//   }
//   await sequelize.sync({force: true})
// }
//
// SyncModels()
//   .then(() => console.log('Synced all models'));
