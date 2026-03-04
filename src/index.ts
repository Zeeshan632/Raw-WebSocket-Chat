import dotenv from "dotenv";
import http from "http";
dotenv.config()

import express from "express"
import { AppDataSource } from "./data-source"
import userRouter from "./router/userRouter"
import cookieParser from "cookie-parser"
import { attachWebSockerServer } from "./ws/server";

const app = express()
const server = http.createServer(app)
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cookieParser())

// routes
app.use("/", userRouter)

attachWebSockerServer(server)

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected')

        server.listen(port, () => {
            console.log(`Server is running on port ${port}`)
        })
    })
    .catch(err => {
        console.log(`Some error occured while connecting with DB: ${err}`)
    })