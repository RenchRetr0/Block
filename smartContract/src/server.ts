import App from "./app";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import TransRoute from './router/transactionRoutes';
import UserRoutes from "./router/userRoutes";
const app = new App({
    port: Number(process.env.PORT) || 3040,
    middlewares: [
        express.json({
            limit: "100mb",
        }),
        express.urlencoded({ extended: true }),
        cors(),
        morgan('dev'),
    ],
    routes: [
        new TransRoute(),
        new UserRoutes()
    ]
});

app.listen();
