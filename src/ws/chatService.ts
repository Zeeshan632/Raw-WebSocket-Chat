import { In } from "typeorm";
import { WebSocket } from "ws";
import { AppDataSource } from "../data-source";
import { Conversation } from "../entity/Conversation";
import { Message } from "../entity/Message";
import { userRepo } from "../router/userRouter";

export class ChatService {
  private messageRepo = AppDataSource.getRepository(Message);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private onlineUsers = new Map<number, WebSocket>();

  addConnection(userId: number, socket: WebSocket) {
    this.onlineUsers.set(userId, socket);
  }

  removeConnection(userId: number) {
    this.onlineUsers.delete(userId);
  }

  getConnection(userId: number) {
    return this.onlineUsers.get(userId);
  }

  async findPrivateConversation(
    user1Id: number,
    user2Id: number,
  ): Promise<Conversation | null> {
    const conversations = await this.conversationRepo
      .createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.participants", "participant")
      .where("participant.id IN (:...ids)", {
        ids: [user1Id, user2Id],
      })
      .getMany();

    const conversation = conversations.find(
      (conv) =>
        conv.participants.length === 2 &&
        conv.participants.some((p) => p.id === user1Id) &&
        conv.participants.some((p) => p.id === user2Id),
    );

    return conversation || null;
  }

  async createConversation(
    firstUserId: number,
    secondUserId: number,
  ): Promise<Conversation> {
    const participants = await userRepo.find({
      where: { id: In([firstUserId, secondUserId]) },
    });

    if (participants.length !== 2) {
      throw new Error("Unable to create conversation: both users must exist.");
    }

    const conversation = this.conversationRepo.create({
      participants,
    });

    const saved = await this.conversationRepo.save(conversation);
    return (await this.getConversationWithParticipants(
      saved.id,
    )) as Conversation;
  }

  async getConversationWithParticipants(
    conversationId: number,
  ): Promise<Conversation | null> {
    return await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ["participants"],
    });
  }

  async saveMessage(
    conversation: Conversation,
    senderId: number,
    content: string,
  ) {
    const message = this.messageRepo.create({
      conversation: { id: conversation.id },
      sender: { id: senderId },
      content,
      deliveredAt: new Date(),
    });
    const savedMessage = await this.messageRepo.save(message);
    return await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });
  }

  async markMessageRead(conversationId: number, lastMessageId: number) {
    try {
      await this.conversationRepo.update({id: conversationId}, {lastMessage: {id: lastMessageId}, lastReadAt: new Date()})
      const conversation = await this.getConversationWithParticipants(conversationId)
      return conversation;
    }catch(err){
      console.log("Some error with markMessageRead:    ", err)
      return null;
    }
  }

  broadcastMessage(conversation: Conversation, message: Message | null) {
    const payload = {
      type: "message",
      conversationId: conversation.id,
      message
    };

    conversation.participants?.forEach((participant) => {
      const socket = this.onlineUsers.get(participant.id);
      if (socket) {
        socket.send(JSON.stringify(payload));
      }
    });
  }

  broadcastTyping(
    conversation: Conversation,
    senderId: number,
    isTyping: boolean,
  ) {
    const payload = JSON.stringify({
      type: "typing",
      conversationId: conversation.id,
      senderId,
      isTyping,
    });

    conversation.participants?.forEach((participant) => {
      if (participant.id === senderId) return;
      const socket = this.onlineUsers.get(participant.id);
      if (socket) {
        socket.send(payload);
      }
    });
  }

  broadcastReadReceipt(
    conversation: Conversation,
    isRead: boolean,
    readAt: Date,
  ) {
    const payload = JSON.stringify({
      type: "read",
      conversationId: conversation.id,
      isRead,
      readAt,
    });

    conversation.participants?.forEach((participant) => {
      const socket = this.onlineUsers.get(participant.id);
      if (socket) {
        socket.send(payload);
      }
    });
  }

  async sendConversationHistory(
    socket: WebSocket,
    conversation: Conversation,
    limit = 20,
    offset = 0,
  ) {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversation.id } },
      relations: ["sender"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    socket.send(
      JSON.stringify({
        type: "history",
        conversationId: conversation.id,
        messages,
      }),
    );
  }
}
