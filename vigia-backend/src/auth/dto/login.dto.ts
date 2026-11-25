import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(150).transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'La contraseña es requerida').max(72),
});

export type LoginDto = z.infer<typeof loginSchema>;
