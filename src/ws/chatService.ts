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
    firstUserId: number,
    secondUserId: number,
  ): Promise<Conversation | null> {
    // Subquery to count total participants per conversation
    const subQuery = this.conversationRepo
      .createQueryBuilder("conversation")
      .leftJoin("conversation.participants", "p")
      .select("conversation.id", "id")
      .addSelect("COUNT(p.id)", "participantCount")
      .groupBy("conversation.id")
      .having("COUNT(p.id) = 2");
    
    return await this.conversationRepo
      .createQueryBuilder("conversation")
      .leftJoinAndSelect("conversation.participants", "participant")
      .where(`conversation.id IN (${subQuery.getQuery()})`)
      .andWhere("participant.id IN (:...ids)", { ids: [firstUserId, secondUserId] })
      .setParameters(subQuery.getParameters())
      .getOne();
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
    return await this.getConversationWithParticipants(saved.id) as Conversation;
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

    return await this.messageRepo.save(message);
  }

  async getMessageById(messageId: number): Promise<Message | null> {
    return await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ["conversation"],
    });
  }

  async markMessageRead(message: Message): Promise<Message> {
    message.isRead = true;
    message.readAt = new Date();
    return await this.messageRepo.save(message);
  }

  broadcastMessage(conversation: Conversation, message: Message) {
    const payload = JSON.stringify({
      type: "message",
      conversationId: conversation.id,
      senderId: message.sender?.id,
      messageId: message.id,
      messageText: message.content,
      createdAt: message.createdAt,
      deliveredAt: message.deliveredAt,
      isRead: message.isRead,
      readAt: message.readAt,
    });

    conversation.participants?.forEach((participant) => {
      const socket = this.onlineUsers.get(participant.id);
      if (socket) {
        socket.send(payload);
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
    readerId: number,
    messageId: number,
    readAt: Date,
  ) {
    const payload = JSON.stringify({
      type: "read",
      conversationId: conversation.id,
      readerId,
      messageId,
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
