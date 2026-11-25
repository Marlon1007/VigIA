import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().trim().email('Correo inválido').max(150).transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  role: z.literal('operator').optional().default('operator'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
