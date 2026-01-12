# Metadata-Based RAG System Enhancement

## Overview

The system has been enhanced with metadata-based filtering to improve the accuracy of document retrieval in the RAG (Retrieval-Augmented Generation) system. This addresses the issue where vector similarity scores were high but retrieved documents were not contextually relevant to the business domain.

## Components Implemented

### 1. Metadata Schema Definition
The system defines structured metadata for each document chunk:

- **user_role**: `training_org` | `student` | `verifier` | `all`
- **section**: `introduction` | `training_org_guide` | `student_guide` | `verifier_guide` | `faq` | `support`
- **topic**: `overview` | `login` | `course_management` | `student_management` | `certificate_issue` | `certificate_receive` | `certificate_verify` | `wallet` | `faq` | `support`
- **action**: `create` | `update` | `delete` | `receive` | `verify` | `connect` | `revoke` | `general`
- **title**: Short description of the chunk content

### 2. Metadata Assignment During Ingestion
- Each document chunk is automatically assigned metadata based on content analysis
- Uses rule-based classification to determine appropriate metadata values
- Maintains consistent metadata assignment for similar content types

### 3. Query Metadata Classification
- Analyzes user questions to infer relevant metadata filters
- Matches question context to appropriate business roles and topics
- Enables targeted retrieval of relevant documents

### 4. Filtered Retrieval Process
- Applies metadata filters before vector similarity search
- Reduces search space to contextually relevant documents
- Falls back to unfiltered search if no relevant documents are found

## Benefits

### Improved Relevance
- Filters eliminate irrelevant documents before similarity calculation
- Ensures retrieved documents match the user's role and intent
- Reduces noise from off-topic but semantically similar content

### Better Performance
- Reduces vector search space by pre-filtering
- Faster retrieval for targeted queries
- More efficient use of computational resources

### Contextual Accuracy
- Documents are matched based on business context, not just keyword similarity
- Role-based filtering ensures appropriate content for different user types
- Topic-based filtering targets specific functional areas

## How It Works

1. **Document Ingestion**: Each chunk gets metadata based on content analysis
2. **Query Processing**: User questions are analyzed to infer relevant metadata
3. **Filtered Retrieval**: Vector search operates on filtered subset of documents
4. **Fallback Logic**: If filtered search yields no results, falls back to unfiltered search
5. **Response Generation**: LLM generates answers based on filtered, relevant context

## Technical Implementation

The system maintains the existing vector embedding logic while adding metadata filtering as a preprocessing step. This preserves the semantic search capability while adding contextual precision.