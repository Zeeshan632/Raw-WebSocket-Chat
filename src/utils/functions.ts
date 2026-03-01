import jwt from "jsonwebtoken";

export const generateTokens = (id: number, name: string, email: string) => {
    const payload = {
        id,
        name,
        email
    }

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessTokenSecret || !refreshTokenSecret) {
        throw new Error("Access token secret or refresh token secret is not defined in environment variables.");
    }

    const accessToken = jwt.sign(payload, accessTokenSecret, {expiresIn: "7d"})
    const refreshToken = jwt.sign({id}, refreshTokenSecret, {expiresIn: "7d"})

    return {accessToken, refreshToken}
}