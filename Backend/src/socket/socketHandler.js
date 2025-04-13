import { User } from "../models/user.model.js";
export const socketHandler = (io) => {

    io.on("connection", (socket) => {

        socket.on("message", () => {

        })

    })

};