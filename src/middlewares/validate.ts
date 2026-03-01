import z, { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate = (validator: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = validator.safeParse(req.body);

    if(!result.success){
        return res.status(400).json({
            message: "Validation failed",
            errors: z.treeifyError(result.error)
        })
    }

    req.body = result.data;
    next();
}