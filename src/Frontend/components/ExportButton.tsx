'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useExport } from '@/hooks/use-export';
import { useTranslation } from '@/hooks/use-translation';

export function ExportButton() {
  const { exportData, isExporting } = useExport();
  const { t } = useTranslation();
  
  return (
    <Button
      onClick={exportData}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.exporting')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {t('common.exportReport')}
        </>
      )}
    </Button>
  );
}
