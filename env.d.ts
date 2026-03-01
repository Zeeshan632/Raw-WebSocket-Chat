declare namespace NodeJS {
    interface ProcessEnv {
        PORT: string,
        DB_HOST: string,
        DB_PORT: string,
        DB_USERNAME: string,
        DB_PASSWORD: string,
        DB_NAME: string,
        ACCESS_TOKEN_SECRET: string,
        REFRESH_TOKEN_SECRET: string
    }
}