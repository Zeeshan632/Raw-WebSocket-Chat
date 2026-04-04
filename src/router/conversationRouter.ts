import { Response, Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { CustomRequest } from "../utils/types";
import { AppDataSource } from "../data-source";
import { Conversation } from "../entity/Conversation";
import { In } from "typeorm";

const conversationRouter = Router();
const conversationRepo = AppDataSource.getRepository(Conversation);

conversationRouter
  .route("/get-conversations")
  .get(verifyJwt, async (req: CustomRequest, res: Response) => {
    try {
      const conversationsOfAUser = await conversationRepo
        .createQueryBuilder("conversation")
        .innerJoin("conversation.participants", "p", "p.id = :userId", {
          userId: req.user?.id,
        })
        .leftJoinAndSelect("conversation.participants", "participant")
        .leftJoinAndSelect("conversation.messages", "message")
        .leftJoinAndSelect("message.sender", "sender")
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select("MAX(m.id)")
            .from("message", "m")
            .where("m.conversationId = conversation.id")
            .getQuery();

          return "message.id = " + subQuery;
        })

        .getMany();
      if (!conversationsOfAUser) {
        return res
          .status(404)
          .json({ message: "Couldn't find user with this email!" });
      }
      const result = conversationsOfAUser.map((conv) => ({
        ...conv,
        receiver: conv.participants.find((p) => p.id !== req.user?.id),
      }));
      return res.status(200).json({ result });
    } catch (err) {
      console.log(err);
    }
  });

export default conversationRouter;
