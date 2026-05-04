# Phase 4 — Logs & Metrics Implementation

## Overview
Phase 4 implements real-time pod logs streaming and Kubernetes metrics visualization using Server-Sent Events (SSE) and Recharts charts. This phase enables monitoring of cluster and pod resource usage (CPU/Memory) and viewing pod logs directly from the web interface.

## Completed Features

### 1. Pod Logs Module (`lib/k8s/logs.ts`)
- **getPodLogs()**: Fetches pod logs from Kubernetes API with configurable tail lines (default: 1000)
- **getPodLogsStream()**: Returns logs for streaming display (currently returns full logs; true streaming can be enhanced later)
- Supports optional container parameter for multi-container pods
- Proper error handling and user-friendly error messages

### 2. Metrics Module (`lib/k8s/metrics.ts`)
- **getNamespacedPodMetrics()**: Fetches CPU/Memory metrics for pods in a namespace
- **getNodeMetrics()**: Fetches CPU/Memory metrics for cluster nodes
- Returns parsed metrics with timestamps
- Gracefully handles Metrics Server unavailability (returns 503 with helpful message)
- Metric value parsing and formatting utilities (exported from `lib/metrics-utils.ts`)

### 3. Metrics Utilities (`lib/metrics-utils.ts`)
- **parseMetricValue()**: Converts Kubernetes metric strings (e.g., "100m", "256Mi") to numeric values
- **formatMetricValue()**: Formats numeric values to human-readable strings with appropriate units
- Handles CPU units: nanoseconds (n), millis (m), cores
- Handles memory units: B, Ki, Mi, Gi, Ti, Pi
- Client-safe utilities that don't import Node.js dependencies

### 4. API Routes

#### Logs Streaming Endpoint (`/api/clusters/[clusterId]/logs`)
- **GET** - SSE streaming endpoint for pod logs
- Query parameters:
  - `namespace` (required): Pod namespace
  - `pod` (required): Pod name
  - `container` (optional): Specific container name
- Returns Server-Sent Events stream with log lines
- Session validation and ownership verification
- Proper error handling with detailed error messages

#### Metrics Endpoint (`/api/clusters/[clusterId]/metrics`)
- **GET** - Fetch cluster and pod metrics
- Query parameters:
  - `type` (required): 'nodes' or 'pods'
  - `namespace` (optional): Required when type='pods'
- Returns JSON with metrics data
- Handles Metrics Server not available scenario gracefully
- Supports both node-level and pod-level metrics

### 5. Components

#### PodLogsViewer (`components/k8s/PodLogsViewer.tsx`)
- Real-time log viewer with SSE connection
- Features:
  - Auto-scrolling to latest logs
  - Manual refresh button
  - Loading and error states
  - Streaming indicator
  - Terminal-style monospace font
  - Truncates after 200 log lines in memory (prevents memory bloat)
- Proper cleanup of EventSource on unmount

#### CpuChart (`components/metrics/CpuChart.tsx`)
- Line chart visualization of CPU metrics over time
- Supports both node and pod-level metrics
- Configurable refresh interval (default: 5s)
- Shows up to 20 data points (sliding window)
- Color-coded lines for different nodes/pods
- Recharts-based with time-series data
- Tooltip formatting with unit conversion

#### MemoryChart (`components/metrics/MemoryChart.tsx`)
- Line chart visualization of Memory metrics over time
- Same features as CpuChart but for memory usage
- Displays metrics in formatted units (B, Ki, Mi, Gi, etc.)
- Real-time updates with configurable refresh interval

### 6. Cluster Detail Page Updates (`app/(dashboard)/clusters/[clusterId]/page.tsx`)
- New "Metrics" tab showing:
  - Node-level CPU and Memory charts
  - Pod-level CPU and Memory charts (namespace-scoped)
  - Grid layout with side-by-side charts
- New "Logs" tab showing:
  - Pod list with clickable pod names
  - Expandable log viewer when pod is selected
  - Back button to return to pod list
  - Live log streaming display

### 7. Pod List Component Enhancement (`components/k8s/PodList.tsx`)
- New optional `onSelectPod` callback prop
- Pod names become clickable links when callback is provided
- Maintains backward compatibility with existing delete functionality
- Styled with accent color to indicate interactivity

## Technical Details

### Server-Sent Events (SSE) Implementation
- Uses `new ReadableStream()` to create Web Streams API streams
- Formats log lines as JSON-encoded SSE messages
- Proper error handling and stream cleanup
- Client-side EventSource listener with automatic reconnection

### Metrics Data Flow
1. Client component periodically fetches `/api/clusters/[clusterId]/metrics`
2. API route decrypts kubeconfig and calls Kubernetes CustomObjectsApi
3. Metrics are parsed and formatted with appropriate units
4. Data points are kept in sliding window (last 20 points)
5. Charts update automatically on refresh interval

### Error Handling
- **Metrics Server unavailable**: Returns 503 status with helpful message
- **Missing kubeconfig**: Returns 400 status
- **Authentication failures**: Returns 401 status
- **Network errors**: Graceful degradation in chart components

## Known Limitations & Future Enhancements

1. **Log Streaming**: Currently fetches full logs and streams them. Can be enhanced to true Kubernetes log streaming with `follow=true` if Kubernetes API client supports it.

2. **Metrics Resolution**: Depends on Kubernetes Metrics Server being installed. Charts show graceful error message if unavailable.

3. **Historical Data**: Charts show only recent 20 data points (5-minute window with 5s refresh). Can be enhanced with longer retention and time-range selection.

4. **Container Selection**: Logs viewer currently shows all logs (or single container if specified). Can be enhanced with container dropdown selector.

## API Compatibility Notes

### Kubernetes Client-Node Versions
- All routes use Promise-based params (Next.js 15 requirement)
- CustomObjectsApi used for metrics (requires cluster with Metrics Server)
- CoreV1Api used for pod logs and information

### Next.js Compatibility
- Requires Next.js 16.2+ (uses Turbopack, Promise params)
- Routes use dynamic params with Promise wrapper
- Client components properly separated from server-only K8s imports

## Testing Recommendations

1. **Logs Endpoint**:
   - Verify logs appear for running pods
   - Test with multi-container pods
   - Verify error handling for non-existent pods

2. **Metrics Endpoint**:
   - Test with cluster that has Metrics Server installed
   - Verify error response when Metrics Server unavailable
   - Test both node and pod metrics

3. **UI Components**:
   - Verify logs auto-scroll works correctly
   - Test metrics chart refresh and data accuracy
   - Verify error states display properly
   - Test navigation between pod list and log viewer

## File Structure
```
kubstorm/
├── lib/
│   ├── k8s/
│   │   ├── logs.ts                 # Pod logs API wrappers
│   │   └── metrics.ts              # Kubernetes metrics API
│   └── metrics-utils.ts            # Client-safe metric formatting
├── components/
│   ├── k8s/
│   │   ├── PodList.tsx             # Updated with onSelectPod
│   │   └── PodLogsViewer.tsx       # Real-time log viewer
│   └── metrics/
│       ├── CpuChart.tsx            # CPU metrics chart
│       └── MemoryChart.tsx         # Memory metrics chart
├── app/
│   └── api/clusters/[clusterId]/
│       ├── logs/route.ts           # SSE logs endpoint
│       └── metrics/route.ts        # Metrics fetch endpoint
└── app/(dashboard)/clusters/[clusterId]/page.tsx  # Enhanced with tabs
```

## Build Status
✓ TypeScript compilation successful
✓ Production build successful
✓ No runtime errors on dev server
