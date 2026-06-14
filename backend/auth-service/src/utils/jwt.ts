import jwt from 'jsonwebtoken';
import { IUser, JwtPayload, RefreshTokenPayload, TokenPair } from '../types';

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
    issuer: 'meenzo-auth',
  });
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as jwt.SignOptions['expiresIn'],
    issuer: 'meenzo-auth',
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer: 'meenzo-auth',
  }) as JwtPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    issuer: 'meenzo-auth',
  }) as RefreshTokenPayload;
};

export const createTokenPair = (user: IUser): TokenPair => {
  const payload: JwtPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user._id.toString() });

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

  return { accessToken, refreshToken, refreshExpiresAt };
};
