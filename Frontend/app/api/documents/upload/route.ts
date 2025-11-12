import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Proxying document upload to backend...');

    // Get form data from request
    const formData = await request.formData();
    
    // Get authentication cookies
    const cookies = request.headers.get('cookie') || '';
    console.log('🍪 Cookies:', cookies);

    // Forward request to backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    console.log('🔗 Backend URL:', `${backendUrl}/api/documents/upload`);
    
    const response = await fetch(`${backendUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
      body: formData,
    });

    console.log('📡 Backend response status:', response.status);
    console.log('📡 Backend response headers:', Object.fromEntries(response.headers));

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Backend returned non-JSON response:', text);
      return Response.json(
        { 
          error: 'Backend error',
          message: 'Server returned invalid response',
          details: text.substring(0, 200)
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend upload error:', data);
      return Response.json(data, { status: response.status });
    }

    console.log('✅ Document upload successful:', data.statistics);
    return Response.json(data);

  } catch (error) {
    console.error('❌ Upload proxy error:', error);
    return Response.json(
      { 
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    { 
      message: 'Document upload endpoint',
      methods: ['POST'],
      accepts: 'multipart/form-data'
    },
    { status: 200 }
  );
}