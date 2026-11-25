import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import type { LoginDto } from './dto/login.dto.js';
import { loginSchema } from './dto/login.dto.js';
import { registerSchema, type RegisterDto } from './dto/register.dto.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body(new ZodValidationPipe(registerSchema)) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login/session')
  async loginSession(@Request() req: any) {
    return { user: req.user, message: 'Sesión iniciada correctamente' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Request() req: { user: { sub: number | string } }) {
    return this.authService.getProfile(req.user.sub);
  }
}
