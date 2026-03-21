// lib/auth.ts
import { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow any email to sign in (no domain restriction)
      return true
    },
    async session({ session, token }) {
      // Get role from token which comes from backend API
      if (token.role) {
        ;(session.user as any).role = token.role;
      }
      return session
    },
    async jwt({ token, user }) {
      // If user object contains role (from backend API), store it in token
      if (user && (user as any).role) {
        ;(token as any).role = (user as any).role;
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
}