import { Injectable, UnauthorizedException, Logger, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Pool } from 'pg';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly pool: Pool;

  constructor(private readonly jwtService: JwtService) {
    const databaseUrl = process.env.DATABASE_URL;
    this.pool = new Pool({
      ...(databaseUrl
        ? { connectionString: databaseUrl }
        : {
            host: process.env.POSTGRES_HOST ?? '127.0.0.1',
            port: Number(process.env.POSTGRES_PORT ?? 55432),
            user: process.env.POSTGRES_USER ?? 'vigia',
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB ?? 'vigia',
          }),
      connectionTimeoutMillis: 5000,
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT id, name, email, role, is_active, password_hash FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    const user = result.rows[0];
    if (!user) {
      this.logger.warn(`Intento de login con email no encontrado: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isMatch = await compare(password, user.password_hash);
    if (!isMatch) {
      this.logger.warn(`Contraseña incorrecta para usuario: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase();
    const existing = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount) {
      throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
    }

    const passwordHash = await hash(registerDto.password, 12);
    let result;
    try {
      result = await this.pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, name, email, role`,
        [registerDto.name, email, passwordHash, registerDto.role],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
      }
      throw error;
    }

    const user = result.rows[0];
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user };
  }

  async getProfile(id: number | string) {
    const result = await this.pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE',
      [id],
    );
    if (!result.rowCount) throw new UnauthorizedException('Usuario no disponible');
    return result.rows[0];
  }
}
