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
      // Add role to session based on new policy
      if (session.user?.email) {
        const email = session.user.email
        let role = 'User' // Default to student
        if (email === '22021207@vnu.edu.vn') {
          role = 'Admin'
        } else if (email === 'tts.tuongntc@vnpay.vn') {
          role = 'Issuer'
        }
        
        // Extend session type to include role
        ;(session.user as any).role = role
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        // Extend token type to include role
        ;(token as any).role = (user as any).role
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