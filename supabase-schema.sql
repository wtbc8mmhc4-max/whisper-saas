-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  provider VARCHAR(50),
  provider_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage table
CREATE TABLE IF NOT EXISTS usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_period_minutes INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  transcriptions_count INTEGER DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  audio_url TEXT,
  text TEXT NOT NULL,
  chunks JSONB NOT NULL DEFAULT '[]',
  duration INTEGER NOT NULL, -- in seconds
  model VARCHAR(100) NOT NULL,
  language VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Usage policies
CREATE POLICY "Users can view own usage" ON usage FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own usage" ON usage FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own usage" ON usage FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Transcriptions policies
CREATE POLICY "Users can view own transcriptions" ON transcriptions FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own transcriptions" ON transcriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own transcriptions" ON transcriptions FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own transcriptions" ON transcriptions FOR DELETE USING (auth.uid()::text = user_id::text);