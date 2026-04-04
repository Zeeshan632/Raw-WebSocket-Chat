import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Message } from "./Message";
import { nullable } from "zod";

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToMany(() => User, (user) => user.conversations)
  @JoinTable()
  participants: User[];

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  @OneToOne(() => Message, {nullable: true})
  lastMessage?: Message;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt?: Date;
  
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
