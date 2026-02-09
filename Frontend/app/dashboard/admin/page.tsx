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

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => {
      const uploadFile = file as UploadFile;
      uploadFile.id = Math.random().toString(36).substr(2, 9);
      uploadFile.detectedType = detectMimeType(file) ?? undefined;
      return uploadFile;
    });

    // Validate files
    const validFiles = newFiles.filter(file => {
      const mimeType = file.detectedType;

      // Check file type
      if (!mimeType || !SUPPORTED_TYPES[mimeType]) {
        toast({
          title: "File không được hỗ trợ",
          description: `${file.name} không thuộc định dạng được hỗ trợ.`,
          variant: "destructive"
        });
        return false;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File quá lớn",
          description: `${file.name} vượt quá giới hạn 10MB.`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    });

    // Check total file count
    if (files.length + validFiles.length > MAX_FILES) {
      toast({
        title: "Quá nhiều file",
        description: `Chỉ có thể upload tối đa ${MAX_FILES} files cùng lúc.`,
        variant: "destructive"
      });
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    
    // Clear the input
    event.target.value = '';
  }, [detectMimeType, files.length, toast]);

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Add tag
  const addTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Handle tag input key press
  const handleTagKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }, [addTag]);

  // Upload files
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: "Không có file",
        description: "Vui lòng chọn ít nhất một file để upload.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const formData = new FormData();

      // Add files
      files.forEach(file => {
        formData.append('documents', file);
      });

      // Add metadata
      if (category) formData.append('category', category);
      if (description) formData.append('description', description);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

      // Simulate progress
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

      // Show success toast
      toast({
        title: "Upload thành công!",
        description: `Đã xử lý ${result.statistics.successfulFiles}/${result.statistics.totalFiles} files, tạo ${result.statistics.totalDocuments} documents.`,
      });

      // Clear form
      setFiles([]);
      setCategory('');
      setDescription('');
      setTags([]);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi khi upload.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [files, category, description, tags, toast]);

  // Drag and drop handlers
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Upload Tài Liệu</h1>
          <p className="text-muted-foreground mt-2">
            Upload tài liệu để huấn luyện chatbot AI hỗ trợ người dùng
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Hỗ trợ file PDF, DOCX, TXT, MD. Tối đa 10MB/file và 10 files/lần upload.
            Tài liệu sẽ được phân tích và tạo embedding để chatbot có thể tìm kiếm thông tin liên quan.
          </AlertDescription>
        </Alert>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Chọn Tài Liệu</CardTitle>
            <CardDescription>
              Kéo thả hoặc chọn file để upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Drop Zone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600">
                Kéo thả file vào đây hoặc nhấp để chọn
              </p>
              <p className="text-sm text-gray-500 mt-2">
                PDF, DOCX, TXT, MD - Tối đa 10MB mỗi file
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

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Files đã chọn ({files.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {SUPPORTED_TYPES[(file.detectedType || file.type) as keyof typeof SUPPORTED_TYPES] ?? 'Không xác định'} • {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <Label>Tiến trình upload</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-500 text-center">
                  Đang xử lý tài liệu... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {files.length > 0 ? `${files.length} file(s)` : 'Tài Liệu'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Upload Results */}
        {uploadResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Kết Quả Upload</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResults.statistics.totalFiles}
                  </div>
                  <div className="text-sm text-gray-500">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResults.statistics.successfulFiles}
                  </div>
                  <div className="text-sm text-gray-500">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {uploadResults.statistics.totalChunks}
                  </div>
                  <div className="text-sm text-gray-500">Text Chunks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {uploadResults.statistics.totalDocuments}
                  </div>
                  <div className="text-sm text-gray-500">Documents</div>
                </div>
              </div>

              {/* File Results */}
              <div className="space-y-2">
                <Label>Chi tiết xử lý file</Label>
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
                              {result.chunkCount} chunks → {result.documentIds.length} documents
                            </p>
                          ) : (
                            <p className="text-xs text-red-600">
                              {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
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