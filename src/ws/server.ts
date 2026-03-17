import { WebSocket, WebSocketServer } from "ws";
import { Conversation } from "../entity/Conversation";
import { ChatService } from "./chatService";

type WsData = string | Buffer | ArrayBuffer | Buffer[];

interface SocketConnection extends WebSocket {
  isAlive: boolean;
}

interface IncomingSocketMessage {
  type: string;
  conversationId?: number;
  receiverId?: number;
  messageText?: string;
  messageId?: number;
  isTyping?: boolean;
  limit?: number;
  offset?: number;
}

const chatService = new ChatService();

export const attachWebSockerServer = (server: any) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket: SocketConnection, req: { userId: number }) => {
    socket.isAlive = true;
    socket.on("pong", () => (socket.isAlive = true));

    chatService.addConnection(req.userId, socket);
    socket.send(
      JSON.stringify({ message: "Welcome to the raw-ws connection" }),
    );

    socket.on("message", async (data: WsData) => {
      const raw = typeof data === "string" ? data : data.toString();
      const payload = JSON.parse(raw) as IncomingSocketMessage;

      const senderId = req.userId;

      let conversation = null as Conversation | null;

      const ensureConversation = async () => {
        if (payload.conversationId) {
          conversation = await chatService.getConversationWithParticipants(
            payload.conversationId,
          );
        }

        if (!conversation && payload.receiverId) {
          conversation = await chatService.findPrivateConversation(
            senderId,
            payload.receiverId,
          );

          if (!conversation) {
            conversation = await chatService.createConversation(
              senderId,
              payload.receiverId,
            );
          }
        }

        return conversation;
      };

      switch (payload.type) {
        case "message": {
          if (!payload.messageText) return;

          conversation = await ensureConversation();
          if (!conversation) return;

          const message = await chatService.saveMessage(
            conversation,
            senderId,
            payload.messageText,
          );

          chatService.broadcastMessage(conversation, message);
          break;
        }

        case "typing": {
          if (!payload.conversationId) return;

          conversation = await chatService.getConversationWithParticipants(
            payload.conversationId,
          );
          if (!conversation) return;

          chatService.broadcastTyping(
            conversation,
            senderId,
            payload.isTyping ?? true,
          );
          break;
        }

        case "read": {
          if (!payload.conversationId || !payload.messageId) return;

          const message = await chatService.getMessageById(payload.messageId);
          if (!message) return;

          const updated = await chatService.markMessageRead(message);

          const conv = await chatService.getConversationWithParticipants(
            payload.conversationId,
          );
          if (!conv) return;

          chatService.broadcastReadReceipt(
            conv,
            senderId,
            updated.id,
            updated.readAt!,
          );
          break;
        }

        case "history": {
          if (!payload.conversationId) return;

          conversation = await chatService.getConversationWithParticipants(
            payload.conversationId,
          );
          if (!conversation) return;

          await chatService.sendConversationHistory(
            socket,
            conversation,
            payload.limit ?? 20,
            payload.offset ?? 0,
          );
          break;
        }

        default:
          // unknown message type
          break;
      }
    });

    socket.on("error", (error) => {
      console.error("WebSocket Error: ", error);
      socket.terminate();
    });

    socket.on("close", () => {
      chatService.removeConnection(req.userId);
      socket.terminate();
    });
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
  });
};
