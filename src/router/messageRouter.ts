import { Response, Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { CustomRequest } from "../utils/types";
import { AppDataSource } from "../data-source";
import { Message } from "../entity/Message";

const messageRouter = Router()
const messageRepo = AppDataSource.getRepository(Message);

messageRouter.route("/:meessageId").get(verifyJwt, async(req: CustomRequest, res: Response) => {
    const {messageId} = req.params;
    try {
        const message = await messageRepo.findOneBy({id: +messageId})
        return res.status(200).json({status: 200, data: message})
    }catch(err){
        console.log("error related to message ====>.    ", err)
        return res.status(401).json({status: 401, message: 'something went wrong!'})
    }
})

export default messageRouter;