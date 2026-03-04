import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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

    @Column()
    password: string;

    @ManyToMany(() => Conversation, conversation => conversation.participants)
    @JoinTable()
    conversations: Conversation[]

    @OneToMany(() => Message, message => message.sender)
    messages: Message[]
}
