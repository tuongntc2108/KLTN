"use client"

import { PersonalInfoForm } from "@/components/profile/PersonalInfoForm"
import { useTranslation } from "@/hooks/use-translation"


export default function StudentProfilePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.descriptionStudent')}</p>
      </div>

      <PersonalInfoForm />
    </div>
  )
}
