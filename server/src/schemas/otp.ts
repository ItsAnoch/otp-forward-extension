import { z } from "zod";

export const otpSchema = z.object({
    otp: z.string().regex(/^\d{4,8}$/, "OTP must be a 4 to 8 digit number"),
});