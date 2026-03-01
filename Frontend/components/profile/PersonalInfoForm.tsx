"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, User, Mail, Wallet, IdCard, Building2, Globe, Languages } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useProfile } from "@/hooks/use-profile"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { ImageCropper } from "@/components/ui/image-cropper"

export function PersonalInfoForm() {
  const { profile, loading, error, updateAvatar, updateLanguage } = useProfile()
  const { refreshAuth } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('toast.avatarSizeError'),
        variant: "destructive"
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('common.error'),
        description: t('toast.avatarTypeError'),
        variant: "destructive"
      })
      return
    }

    // Read file and open cropper
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
      setCropperOpen(true)
    }
    reader.readAsDataURL(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = async (croppedImage: Blob) => {
    setCropperOpen(false)
    setIsUploadingAvatar(true)

    const result = await updateAvatar(croppedImage)
    
    if (result.success) {
      // Refresh auth to update avatar in layout (sidebar & header)
      await refreshAuth()
      
      toast({
        title: t('common.success'),
        description: t('toast.avatarUpdated')
      })
    } else {
      toast({
        title: t('common.error'),
        description: result.error || t('toast.avatarError'),
        variant: "destructive"
      })
    }

    setIsUploadingAvatar(false)
    setSelectedImage(null)
  }

  const handleCropperClose = () => {
    setCropperOpen(false)
    setSelectedImage(null)
  }

  const handleLanguageChange = async (language: 'vi' | 'en') => {
    setIsUpdatingLanguage(true)
    const result = await updateLanguage(language)
    setIsUpdatingLanguage(false)

    if (result.success) {
      const langName = language === 'vi' ? t('common.vietnamese') : t('common.english')
      toast({
        title: t('common.success'),
        description: `${t('toast.languageUpdated')} ${langName}`
      })
      // Reload page to apply language changes
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast({
        title: t('common.error'),
        description: result.error || t('toast.languageError'),
        variant: "destructive"
      })
    }
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'Student': { label: t('roles.student'), variant: 'default' },
      'Issuer': { label: t('roles.issuer'), variant: 'secondary' },
      'Admin': { label: t('roles.admin'), variant: 'destructive' }
    }
    
    const roleInfo = roleMap[role] || { label: role, variant: 'outline' }
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
  }

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      // If it's a relative path, prepend API URL
      if (profile.avatar_url.startsWith('/')) {
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${profile.avatar_url}`
      }
      return profile.avatar_url
    }
    return undefined
  }

  const getInitials = () => {
    if (!profile?.full_name) return 'U'
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t('common.loadingInfo')}</span>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t('toast.loadError')}</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Avatar & Language Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.editSettings')}</CardTitle>
          <CardDescription>{t('profile.editSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={getAvatarUrl()} alt={profile.full_name || 'User'} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="text-base font-medium">
                {t('profile.avatar')}
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                {t('profile.avatarDesc')}
              </p>
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('profile.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('profile.uploadNew')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              {t('profile.language')}
            </Label>
            <Select
              value={profile.language || 'vi'}
              onValueChange={(value) => handleLanguageChange(value as 'vi' | 'en')}
              disabled={isUpdatingLanguage}
            >
              <SelectTrigger id="language" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">{t('common.vietnamese')}</SelectItem>
                <SelectItem value="en">{t('common.english')}</SelectItem>
              </SelectContent>
            </Select>
            {isUpdatingLanguage && (
              <p className="text-sm text-muted-foreground">{t('toast.updating')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.personalInfo')}</CardTitle>
          <CardDescription>{t('profile.personalInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('profile.fullName')}
            </Label>
            <Input
              id="full-name"
              value={profile.full_name || t('profile.notUpdated')}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('profile.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>{t('profile.role')}</Label>
            <div>{getRoleBadge(profile.role)}</div>
          </div>

          {/* Wallet Address */}
          {profile.wallet_address && (
            <div className="space-y-2">
              <Label htmlFor="wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {t('profile.wallet')}
              </Label>
              <Input
                id="wallet"
                value={profile.wallet_address}
                readOnly
                className="bg-muted font-mono text-sm"
              />
            </div>
          )}

          {/* Student ID (for students only) */}
          {profile.role === 'Student' && profile.student_id && (
            <div className="space-y-2">
              <Label htmlFor="student-id" className="flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                {t('profile.studentId')}
              </Label>
              <Input
                id="student-id"
                value={profile.student_id}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

          {/* Organization (for issuers only) */}
          {profile.role === 'Issuer' && profile.organization && (
            <div className="space-y-2">
              <Label htmlFor="organization" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('profile.organization')}
              </Label>
              <Input
                id="organization"
                value={profile.organization}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

          {/* Website (for issuers only) */}
          {profile.role === 'Issuer' && profile.website && (
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('profile.website')}
              </Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                readOnly
                className="bg-muted"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Cropper Dialog */}
      {selectedImage && (
        <ImageCropper
          open={cropperOpen}
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onClose={handleCropperClose}
        />
      )}
    </div>
  )
}
