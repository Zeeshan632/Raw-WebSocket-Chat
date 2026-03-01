import dotenv from "dotenv";
dotenv.config()

import express from "express"
import { AppDataSource } from "./data-source"
import userRouter from "./router/userRouter"
import cookieParser from "cookie-parser"

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cookieParser())

// routes
app.use("/", userRouter)

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected')

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`)
        })
    })
    .catch(err => {
        console.log(`Some error occured while connecting with DB: ${err}`)
    })