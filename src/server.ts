import App from "./app";
import cors from "cors";
import express from "express";
import AuthRoutes from "./router/authRoutes";
import ProfileRoutes from "./router/profileRoutes";
import EventRouter from "./router/eventRouter";
import ImageRouter from "./router/imageRouter";
import CircleRouter from "./router/circleRouter";
import TicketRouter from "./router/ticketRouter";
import PayPalRouter from "./router/paypalRouter";
import SupportRouter from "./router/supportRouter";
import morgan from "morgan";
import GoogleRouter from './router/googleRouter';
import SearchRouter from "./router/searchRouter";
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
        new AuthRoutes(),
        new ProfileRoutes(),
        new EventRouter(),
        new ImageRouter(),
        new CircleRouter(),
        new TicketRouter(),
        new PayPalRouter(),
        new SupportRouter(),
        new GoogleRouter(),
        new SearchRouter()
    ]
});

app.listen();
