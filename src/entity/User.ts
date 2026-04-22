import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Conversation } from "./Conversation";
import { Message } from "./Message";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column({select: false})
    password: string;

    @ManyToMany(() => Conversation, conversation => conversation.participants)
    conversations: Conversation[]

    @OneToMany(() => Message, message => message.sender)
    messages: Message[]

    @OneToOne(() => Message, {nullable: true})
    @JoinColumn()
    lastReadMessage?: Message;
}
