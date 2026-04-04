import { WebSocket, WebSocketServer } from "ws";
import { Conversation } from "../entity/Conversation";
import { ChatService } from "./chatService";
import { parse } from "url";

type WsData = string | Buffer | ArrayBuffer | Buffer[];

interface SocketConnection extends WebSocket {
  isAlive: boolean;
}

interface IncomingSocketMessage {
  type: "message" | "typing" | "read" | "history";
  conversationId?: number;
  receiverId?: number;
  messageText?: string;
  lastMessageId?: number;
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

  wss.on(
    "connection",
    async (socket: SocketConnection, req: { url: string }) => {
      const { query } = parse(req.url!, true);

      const userId = Number(query.userId);

      if (!userId || !Number.isFinite(userId)) {
        socket.send(JSON.stringify({ error: "Invalid or missing userId" }));
        socket.terminate();
        return;
      }
      socket.isAlive = true;
      socket.on("pong", () => (socket.isAlive = true));

      chatService.addConnection(userId, socket);
      socket.send(
        JSON.stringify({ message: "Welcome to the raw-ws connection" }),
      );

      socket.on("message", async (data: WsData) => {
        try {
          const raw = typeof data === "string" ? data : data.toString();
          // incoming message validation
          let payload: IncomingSocketMessage;
          try {
            payload = JSON.parse(raw) as IncomingSocketMessage;
          } catch {
            socket.send(JSON.stringify({ error: "Invalid JSON payload" }));
            return;
          }

          const senderId = userId;

          let conversation = null as Conversation | null;

          const ensureConversation = async (): Promise<Conversation | null> => {
            try {
              if (payload.conversationId) {
                const existing =
                  await chatService.getConversationWithParticipants(
                    payload.conversationId,
                  );

                if (existing) {
                  return existing;
                }
              }

              if (!payload.receiverId) return null;

              let existingConversation =
                await chatService.findPrivateConversation(
                  senderId,
                  payload.receiverId,
                );

              if (existingConversation) {
                return existingConversation;
              }

              const created = await chatService.createConversation(
                senderId,
                payload.receiverId,
              );

              conversation = await chatService.getConversationWithParticipants(
                created.id,
              );
              return conversation;
            } catch (err) {
              console.error("ensureConversation error:", err);
              return null;
            }
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
              console.log('triggered........')
              if (!payload.conversationId || !payload.lastMessageId) return;

              const conversation = await chatService.markMessageRead(
                payload.conversationId,
                payload.lastMessageId,
              );

              if (!conversation) return;

              chatService.broadcastReadReceipt(conversation, true, new Date());
              break;
            }

            case "history": {
              conversation = await ensureConversation();
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
        } catch (err) {
          console.error(err);
          socket.send(JSON.stringify({ error: "Internal server error" }));
        }
      });

      socket.on("error", (error) => {
        console.error("WebSocket Error: ", error);
        socket.terminate();
      });

      socket.on("close", () => {
        chatService.removeConnection(userId);
        socket.terminate();
      });
    },
  );

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
