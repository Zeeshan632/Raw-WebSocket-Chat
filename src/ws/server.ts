import { In } from "typeorm";
import { WebSocket, WebSocketServer } from "ws";
import { AppDataSource } from "../data-source";
import { Conversation } from "../entity/Conversation";
import { Message } from "../entity/Message";
import { userRepo } from "../router/userRouter";

interface SocketConnection extends WebSocket {
  isAlive: boolean;
}

const messageRepo = AppDataSource.getRepository(Message);
const conversationRepo = AppDataSource.getRepository(Conversation);

const createConversation = async (
  firstUserId: string,
  secondUserId: string,
) => {
  const participants = await userRepo.find({
    where: { id: In([firstUserId, secondUserId]) },
  });
  const conversation = conversationRepo.create({
    participants,
  });
  await conversationRepo.save(conversation);
};

export const attachWebSockerServer = (server: any) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket: SocketConnection, req) => {
    socket.isAlive = true;
    socket.on("pong", () => (socket.isAlive = true));
    socket.send(
      JSON.stringify({ message: "Welcome to the raw-ws connection" }),
    );

    
  });

  const interval = setInterval(() => {
    (wss.clients as Set<SocketConnection>).forEach(
      (socket: SocketConnection) => {
        if (!socket.isAlive) {
          return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping();
      },
    );
  }, 10000);

  wss.on("close", () => {
    clearInterval(interval);
  })
};
