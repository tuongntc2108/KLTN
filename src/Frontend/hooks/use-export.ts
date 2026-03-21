// hooks/use-export.ts
'use client';

import { useState } from 'react';
import { useToast } from './use-toast';
import { useTranslation } from './use-translation';

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const exportData = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }
      
      // Get filename từ header hoặc fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'report.xlsx';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }
      
      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('common.exportSuccess'),
        description: `${t('common.exportSuccessDesc')} ${filename}`,
        variant: 'default'
      });
      
    } catch (error: any) {
      console.error('[Export] Error:', error);
      toast({
        title: t('common.exportError'),
        description: error.message || t('common.exportErrorDesc'),
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return { exportData, isExporting };
}
