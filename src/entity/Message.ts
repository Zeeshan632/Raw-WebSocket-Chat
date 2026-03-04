import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Conversation } from "./Conversation";

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number

    @Column('text')
    content: string

    @ManyToOne(() => User, user => user.messages)
    sender: User

    @ManyToOne(() => Conversation, conversation => conversation.messages)
    conversation: Conversation

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}