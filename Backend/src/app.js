// express application initialization
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

// set middlewares for the server
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));       // parses the incoming requests (from forms and postman) with urlencoded payloads and place it to req.body
app.use(cookieParser());


app.get("/", (req, res) => {
    console.log("request on /");
    res.send("Hello world");
    // res.sendFile("Hello world"); 
})

// set the routes for the server
import { router as userRouter } from "./routes/user.route.js";
app.use("/api/users", userRouter);

export { app };