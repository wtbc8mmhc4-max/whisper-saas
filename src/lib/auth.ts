import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { dbQueries, getSupabaseClient } from './supabase';

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_ID || !GOOGLE_SECRET) {
  console.error("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google login will fail.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_ID || "",
      clientSecret: GOOGLE_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        const supabase = getSupabaseClient();
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (!existingUser) {
          const newUser = await dbQueries.createUser({
            email: user.email!,
            name: user.name || undefined,
            provider: account?.provider,
            provider_id: account?.providerAccountId,
          });

          if (newUser?.id) {
            const userId = newUser.id;
            // Create subscription and usage in parallel (best effort)
            await Promise.allSettled([
            supabase.from('subscriptions').insert({
              user_id: userId,
              plan_id: 'free',
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            supabase.from('usage').insert({
              user_id: userId,
              current_period_minutes: 0,
              total_minutes: 0,
              transcriptions_count: 0,
              last_reset: new Date().toISOString(),
            }),
          ]);
          }
        }

        return true;
      } catch (error) {
        console.error('登录失败:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user?.email && token.sub) {
        try {
          const userData = await dbQueries.getUser(token.sub);
          if (userData) {
            session.user.id = userData.id as string;
            session.user.subscription = userData.subscription as any;
            session.user.usage = userData.usage as any;
          }
        } catch (error) {
          console.error('获取用户数据失败:', error);
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        try {
          const supabase = getSupabaseClient();
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email!)
            .maybeSingle();

          if (userData) {
            token.sub = userData.id as string;
          }
        } catch (error) {
          console.error('JWT 处理失败:', error);
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
