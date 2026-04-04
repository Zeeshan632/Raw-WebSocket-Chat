import jwt from "jsonwebtoken";

const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET ?? "Default Access Token Secret"
const RefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET ?? "Default Refresh Token Secret"

export const generateTokens = (id: number, name: string, email: string) => {
    const payload = {
        id,
        name,
        email
    }

    if (!AccessTokenSecret || !RefreshTokenSecret) {
        throw new Error("Access token secret or refresh token secret is not defined in environment variables.");
    }

    const accessToken = jwt.sign(payload, AccessTokenSecret, {expiresIn: "7d"})
    const refreshToken = jwt.sign({id}, RefreshTokenSecret, {expiresIn: "7d"})

    return {accessToken, refreshToken}
}