"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogOut, User, FileText, Sparkles } from "lucide-react"
import { APP_VERSION } from "@/lib/constants"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-pink-400 to-rose-400 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800 hidden sm:block">
              契約書生成システム
            </span>
            <span className="flex items-center gap-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 text-sm px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              v{APP_VERSION}
            </span>
          </Link>

          {session?.user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {session.user.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-pink-500" />
                  </div>
                )}
                <span className="hidden sm:block">{session.user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:block">ログアウト</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
