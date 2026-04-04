import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { userRepo } from "../router/userRouter";
import { CustomRequest } from "../utils/types";

const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET ?? "Default Access Token Secret"

export const verifyJwt = async(req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if(!token){
            return res.status(401).json({error: 401, message: "Unauthorized request!"})
        }

        const decodedToken: any = jwt.verify(token, AccessTokenSecret)

        const user = await userRepo.findOneBy({id: decodedToken?.id})

        if(!user){
            return res.status(401).json({error: 401, message: "Invalid access token"})
        }
        
        req.user = user
        
        next()
    }catch(err){
        return res.status(401).json({error: 401, message: err})
    }
}