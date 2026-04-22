import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
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

    @Column()
    conversationId: number
    
    @ManyToOne(() => Conversation, conversation => conversation.messages)
    @JoinColumn({name: 'conversationId'})
    conversation: Conversation

    @Column({ type: 'timestamptz', nullable: true })
    deliveredAt?: Date

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column('boolean', { default: false })
    isRead: boolean
}