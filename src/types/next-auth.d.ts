import { Subscription, UserUsage } from "@/types"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      subscription?: Subscription
      usage?: UserUsage
    }
  }

  interface User {
    id: string
    subscription?: Subscription
    usage?: UserUsage
  }
}