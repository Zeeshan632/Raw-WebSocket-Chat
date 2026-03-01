import { Router } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validate } from "../middlewares/validate";
import {
  createUserValidator,
  loginUserValidator,
} from "../validations/user.validation";
import * as bcrypt from "bcrypt";
import { generateTokens } from "../utils/functions";

const userRouter = Router();
const userRepo = AppDataSource.getRepository(User);

//Create User
userRouter.post("/signup", validate(createUserValidator), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userRepo.findOneBy({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = userRepo.create({ name, email, password: hashedPassword });
    await userRepo.save(newUser);

    res
      .status(201)
      .json({ message: "User created successfully", user: {id: newUser.id, name: newUser.name, email: newUser.email} });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login User
userRouter.post("/login", validate(loginUserValidator), async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await userRepo.findOneBy({ email });

    if (!findUser) {
      return res
        .status(404)
        .json({ message: "Couldn't find user with this email!" });
    }

    const comparePassword = bcrypt.compare(password, findUser.password);

    if (!comparePassword) {
      return res.status(401).json({ messsage: "Incorrect password!" });
    }

    const { accessToken, refreshToken } = generateTokens(
      findUser.id,
      findUser.name,
      findUser.email,
    );

    return res
      .status(200)
      .json({
        data: { id: findUser.id, name: findUser.name, email: findUser.email },
        accessToken,
        refreshToken,
      });

  } catch (err) {
    console.error("Error loggin in user: ", err);
    res.status(500).json({ message: "Internal server error while loggin in!" });
  }
});

export default userRouter;
