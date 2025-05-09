// express application initialization
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
const app = express();

// set middlewares for the server
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'], // Allow specific origins for better security
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// For debugging CORS issues
app.use((req, res, next) => {
  console.log(`${req.method} request for ${req.url}`);
  next();
});

app.use(express.json({limit: '10mb'}));  // Increase limit for code submissions
app.use(express.urlencoded({ extended: true }));       // parses the incoming requests (from forms and postman) with urlencoded payloads and place it to req.body
app.use(cookieParser());

// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

app.get("/", (req, res) => {
    console.log("request on /");
    res.send("Hello world");
    // res.sendFile("Hello world"); 
})

// set the routes for the server
import userRouter from "./routes/user.route.js";
import roomRouter from "./routes/room.route.js";
import { router as executeRouter } from "./routes/execute.route.js";
import { router as fileRouter } from "./routes/file.route.js";
import { router as messageRouter } from "./routes/message.route.js";
import snippetRouter from "./routes/snippet.route.js";
import taskRouter from "./routes/task.route.js";
import projectRouter from "./routes/project.route.js";

app.use("/api/users", userRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/execute", executeRouter);
app.use("/api/files", fileRouter);
app.use("/api/messages", messageRouter);
app.use("/api/snippets", snippetRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/projects", projectRouter);

export { app };