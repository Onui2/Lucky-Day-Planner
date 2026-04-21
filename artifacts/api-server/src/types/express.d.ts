export {};

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      role?: string | null;
    }

    interface Request {
      isAuthenticated(): this is Request & { user: User };
      user?: User;
    }
  }
}
