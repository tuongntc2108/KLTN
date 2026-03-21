# Enhanced RAG System with LLM-Based Metadata Classification

## Overview
The RAG system has been enhanced with LLM-based metadata classification to improve the accuracy of document retrieval. This addresses the issue where vector similarity scores were high but retrieved documents were not contextually relevant to the business domain.

## Key Improvements

### 1. LLM-Based Document Classification
- **Before**: Hardcoded rule-based classification during ingestion
- **After**: LLM-powered classification using Gemini for more accurate metadata assignment
- **Benefits**: More nuanced understanding of document content and better metadata assignment

### 2. LLM-Based Query Classification  
- **Before**: Rule-based query analysis
- **After**: LLM-powered query analysis to better understand user intent
- **Benefits**: More accurate inference of user role and topic from questions

### 3. Improved Pipeline Architecture

#### Ingest Pipeline:
```
Load Document
    ↓
Chunk
    ↓
LLM classify metadata
    ↓
Save to Vector DB
```

#### Query Pipeline:
```
User question
    ↓
LLM infer topic (bounded)
    ↓
Retrieve (with metadata filters)
    ↓
If low confidence → fallback
```

### 4. Enhanced Fallback Mechanism
- If filtered retrieval returns no results
- OR if similarity scores are too low
- System automatically falls back to unfiltered search
- Maintains accuracy while ensuring responses

### 5. Maintained Compatibility
- Preserves existing vector embedding logic
- Keeps the same database schema
- Maintains all existing functionality
- Adds metadata filtering as enhancement

## Technical Implementation

### Metadata Schema
- **user_role**: `training_org` | `student` | `verifier` | `all`
- **section**: `introduction` | `training_org_guide` | `student_guide` | `verifier_guide` | `faq` | `support`
- **topic**: `overview` | `login` | `course_management` | `student_management` | `certificate_issue` | `certificate_receive` | `certificate_verify` | `wallet` | `faq` | `support`
- **action**: `create` | `update` | `delete` | `receive` | `verify` | `connect` | `revoke` | `general`
- **title**: Short description of the chunk content

### Database Integration
- Metadata stored in the existing `metadata JSONB` column
- PostgreSQL native JSON operators used for efficient filtering
- Vector search runs on filtered subset for better relevance

### Error Handling
- Graceful fallback to rule-based classification if LLM fails
- Continues operation if API key is missing
- Preserves all existing error handling patterns

## Benefits

### Improved Accuracy
- Documents are classified with better understanding of context
- Queries are matched to appropriate document categories
- Reduced irrelevant document retrieval

### Better Performance
- Metadata filtering reduces vector search space
- More targeted retrieval leads to fewer unnecessary computations
- Maintains fast response times

### Scalability
- LLM-based classification adapts to new document types
- Flexible metadata schema supports evolving requirements
- Backwards-compatible with existing data

## Files Modified
- `metadataClassification.js`: Added LLM-based classification with rule-based fallback
- `loadDocuments.js`: Updated to use async LLM-based chunk classification  
- `ragChain.js`: Updated to use async LLM-based query classification with improved fallback logic
- `vectorStore.js`: Enhanced metadata filtering with proper parameter handling
- `metadataSystemSummary.md`: Documentation of the enhancement