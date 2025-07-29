import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { supabase, dbQueries } from './supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        // Check if user exists in our database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // Create new user with default subscription and usage
          const newUser = await dbQueries.createUser({
            email: user.email!,
            name: user.name || undefined,
            provider: account?.provider,
            provider_id: account?.providerAccountId,
          });

          // Create default subscription (free plan)
          await supabase.from('subscriptions').insert({
            user_id: newUser.id,
            plan_id: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          });

          // Create usage record
          await supabase.from('usage').insert({
            user_id: newUser.id,
            current_period_minutes: 0,
            total_minutes: 0,
            transcriptions_count: 0,
            last_reset: new Date().toISOString(),
          });
        }

        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const userData = await dbQueries.getUser(token.sub!);
          session.user.id = userData.id;
          session.user.subscription = userData.subscription;
          session.user.usage = userData.usage;
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email!)
            .single();
          
          if (userData) {
            token.sub = userData.id;
          }
        } catch (error) {
          console.error('Error in JWT callback:', error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};