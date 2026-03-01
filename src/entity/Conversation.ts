import {
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Message } from "./Message";

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToMany(() => User, (user) => user.conversations)
  @JoinTable()
  participants: User[];

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
