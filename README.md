# WhisperSaaS - AI-Powered Speech Recognition

A modern SaaS application for speech-to-text transcription using OpenAI's Whisper model, built with Next.js and deployed on Vercel.

## Features

- 🎵 **Multiple Audio Sources**: Upload files, record directly, or transcribe from URLs
- 🌍 **Multi-Language Support**: Transcribe in 100+ languages with high accuracy
- ⚡ **Real-time Processing**: Get transcriptions as you speak with live processing
- 📊 **Export Options**: Export in multiple formats (TXT, SRT, VTT, JSON)
- 👤 **User Authentication**: Secure OAuth with Google and GitHub
- 💳 **Subscription Management**: Flexible pricing plans with Stripe integration
- 📈 **Usage Analytics**: Track transcription history and usage statistics

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with OAuth providers
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **AI Models**: Transformers.js (Whisper)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google OAuth app
- GitHub OAuth app
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/whisper-saas.git
cd whisper-saas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in the environment variables:
- NextAuth configuration
- OAuth provider credentials
- Supabase configuration
- Stripe keys

4. Set up the database:
   - Create a new Supabase project
   - Run the SQL from `supabase-schema.sql` in the Supabase SQL editor

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

Create a `.env.local` file with:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## Deployment on Vercel

1. Fork/clone this repository to your GitHub account

2. Import the project in Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import from GitHub

3. Configure environment variables in Vercel:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`

4. Set up OAuth redirect URLs:
   - Google: Add `https://your-domain.vercel.app/api/auth/callback/google`
   - GitHub: Add `https://your-domain.vercel.app/api/auth/callback/github`

5. Configure Stripe webhooks:
   - Add webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
   - Select relevant events (customer.subscription.*)

6. Deploy:
   - Vercel will automatically deploy on every push to main
   - Your app will be available at `https://your-project.vercel.app`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── audio/            # Audio-related components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## API Routes

- `/api/auth/[...nextauth]` - NextAuth authentication
- `/api/transcriptions` - Transcription management
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/usage` - User usage statistics

## Subscription Plans

- **Free**: 30 minutes/month, basic models
- **Pro**: 10 hours/month, all models, API access ($9/month)
- **Business**: Unlimited transcription, priority support ($29/month)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@whispersaas.com or join our Discord community.

