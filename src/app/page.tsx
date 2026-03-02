"use client"

import { Button } from "@/components/ui/button"
import { Plane } from "lucide-react"
import { signIn } from "next-auth/react"

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="mx-auto w-full max-w-sm space-y-6 flex flex-col items-center">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AFCrashpad CRM</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the portal
          </p>
        </div>

        <div className="w-full mt-8">
          <Button
            size="lg"
            className="w-full font-medium"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  )
}
