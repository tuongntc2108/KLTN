'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

interface UploadFile extends File {
  id: string;
  preview?: string;
  detectedType?: string;
}

interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  chunkCount: number;
  documentIds: number[];
  error?: string;
}

interface UploadResponse {
  message: string;
  results: UploadResult[];
  statistics: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalChunks: number;
    totalDocuments: number;
  };
}

const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'MD'
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export default function DocumentUploadPage() {
  const { t } = useTranslation()
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResponse | null>(null);

  const { toast } = useToast();

  const detectMimeType = useCallback((file: File) => {
    if (file.type && SUPPORTED_TYPES[file.type]) {
      return file.type;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && EXTENSION_MIME_MAP[extension]) {
      return EXTENSION_MIME_MAP[extension];
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => {
      const uploadFile = file as UploadFile;
      uploadFile.id = Math.random().toString(36).substr(2, 9);
      uploadFile.detectedType = detectMimeType(file) ?? undefined;
      return uploadFile;
    });

    const validFiles = newFiles.filter(file => {
      const mimeType = file.detectedType;

      if (!mimeType || !SUPPORTED_TYPES[mimeType]) {
        toast({
          title: t('adminChatbot.unsupportedFileTitle'),
          description: `${file.name} ${t('adminChatbot.unsupportedFileDesc')}`,
          variant: "destructive"
        });
        return false;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: t('adminChatbot.fileTooLargeTitle'),
          description: `${file.name} ${t('adminChatbot.fileTooLargeDesc')}`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    });

    if (files.length + validFiles.length > MAX_FILES) {
      toast({
        title: t('adminChatbot.tooManyFilesTitle'),
        description: `${t('adminChatbot.tooManyFilesDesc')} ${MAX_FILES} ${t('adminChatbot.tooManyFilesMax')}`,
        variant: "destructive"
      });
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    event.target.value = '';
  }, [detectMimeType, files.length, toast]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const addTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleTagKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }, [addTag]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: t('adminChatbot.noFileError'),
        description: t('adminChatbot.noFileErrorDesc'),
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const formData = new FormData();

      files.forEach(file => {
        formData.append('documents', file);
      });

      if (category) formData.append('category', category);
      if (description) formData.append('description', description);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result: UploadResponse = await response.json();
      setUploadResults(result);

      toast({
        title: t('adminChatbot.uploadSuccessTitle'),
        description: `${t('adminChatbot.uploadSuccessDesc')} ${result.statistics.successfulFiles}/${result.statistics.totalFiles} ${t('adminChatbot.uploadSingleFile')} ${result.statistics.totalDocuments}${t('adminChatbot.uploadDocuments')}`,
      });

      setFiles([]);
      setCategory('');
      setDescription('');
      setTags([]);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('adminChatbot.uploadErrorTitle'),
        description: error instanceof Error ? error.message : t('adminChatbot.uploadErrorDesc'),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [files, category, description, tags, toast, t]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    const fileEvent = {
      target: { files: droppedFiles }
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleFileSelect(fileEvent);
  }, [handleFileSelect]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t('adminChatbot.pageTitle')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('adminChatbot.pageSubtitle')}
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('adminChatbot.supportInfo')}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{t('adminChatbot.selectTitle')}</CardTitle>
            <CardDescription>
              {t('adminChatbot.selectDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600">
                {t('adminChatbot.dragDropText')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('adminChatbot.dragDropHint')}
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('adminChatbot.filesSelectedLabel')} ({files.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {SUPPORTED_TYPES[(file.detectedType || file.type) as keyof typeof SUPPORTED_TYPES] ?? t('adminChatbot.fileDetailsNoType')} • {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                        aria-label={t('adminChatbot.removeButtonAria')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Label>{t('adminChatbot.uploadProgressLabel')}</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-500 text-center">
                  {t('adminChatbot.uploadProgressText')}{uploadProgress}%
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('adminChatbot.uploadingButtonText')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('adminChatbot.uploadButtonText')} {files.length > 0 ? `${files.length} ${t('adminChatbot.uploadButtonFiles')}` : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {uploadResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{t('adminChatbot.resultTitle')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResults.statistics.totalFiles}
                  </div>
                  <div className="text-sm text-gray-500">{t('adminChatbot.resultTotalFiles')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResults.statistics.successfulFiles}
                  </div>
                  <div className="text-sm text-gray-500">{t('adminChatbot.resultSuccessful')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {uploadResults.statistics.totalChunks}
                  </div>
                  <div className="text-sm text-gray-500">{t('adminChatbot.resultTextChunks')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {uploadResults.statistics.totalDocuments}
                  </div>
                  <div className="text-sm text-gray-500">{t('adminChatbot.resultDocuments')}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('adminChatbot.resultDetailsLabel')}</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadResults.results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm text-gray-900">{result.filename}</p>
                          {result.status === 'success' ? (
                            <p className="text-xs text-green-600">
                              {result.chunkCount} {t('adminChatbot.resultChunkDoc')} {result.documentIds.length} {t('adminChatbot.resultDocumentsLabel')}
                            </p>
                          ) : (
                            <p className="text-xs text-red-600">
                              {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {t(`adminChatbot.result${result.status === 'success' ? 'Success' : 'Error'}` as any)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
