"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  avatarUrl?: string | null
  userName?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl"
}

/**
 * Get user initials from full name
 */
const getInitials = (name?: string | null): string => {
  if (!name) return "U"
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get full avatar URL with cache busting
 */
const getAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined
  
  // If it's a relative path, prepend API URL
  if (avatarUrl.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    return `${baseUrl}${avatarUrl}`
  }
  
  return avatarUrl
}

export function UserAvatar({ 
  avatarUrl, 
  userName, 
  size = "md", 
  className 
}: UserAvatarProps) {
  const fullAvatarUrl = getAvatarUrl(avatarUrl)
  const initials = getInitials(userName)

  return (
    <Avatar className={cn(sizeMap[size], className)}>
      <AvatarImage 
        src={fullAvatarUrl} 
        alt={userName || "User"} 
      />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
