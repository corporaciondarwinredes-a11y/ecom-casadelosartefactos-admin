import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas para seguridad en paneles comerciales
  },
  cookies: {
    sessionToken: {
      name: 'ecom_admin_session_token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales Corporación Darwin',
      credentials: {
        email: { label: 'Correo Electrónico', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Ingrese correo y contraseña');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { profile: true },
        });

        if (!user || !user.password) {
          throw new Error('Credenciales inválidas');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Credenciales inválidas');
        }

        // Devolver únicamente datos no sensibles - NUNCA el hash de la contraseña
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile
            ? {
                canCatalog: user.profile.canCatalog,
                canOrders: user.profile.canOrders,
                canValidatePayments: user.profile.canValidatePayments,
                canKardex: user.profile.canKardex,
                canUsers: user.profile.canUsers,
                canErpExport: user.profile.canErpExport,
              }
            : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.profile = (user as any).profile;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).profile = token.profile;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
