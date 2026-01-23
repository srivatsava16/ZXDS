import ApiService from './ApiService';

export interface Report {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'inactive' | 'pending';
    type: 'universal-pull' | 'zip-radius' | 'data-stream';
}

export interface StatsConfig {
    configId: number;
    fields: string;
    breakdown_by: string;
}

export interface StatsConfiguration {
    source_tables: string;
    configs: StatsConfig[];
}

export interface SuppressionDataFlow {
    operationName: string;
    inputCount: number;
    outputCount: number;
}

export interface SuppressionBreakdown {
    inputSource: string;
    dataFlow: SuppressionDataFlow[];
}

export interface DynamicStatsData {
    inputSource: string;
    countsOn: string;
    breakdownBy: string;
    isDistinct?: boolean; // Deprecated: for backward compatibility
    distinctFields?: string[]; // New: array of fields that should have distinct counts
    data: any[]; // The actual stats results from the API
}

export interface ReportData {
    id: number;
    requestName: string;
    createdDate: string | null;
    processedDate: string | null;
    createdBy: string;
    updatedBy: string;
    updatedDate: string | null;
    status: 'Pending' | 'Inprogress' | 'Completed' | 'Failed' | 'Waiting';
    requestType: 'Adhoc' | 'Scheduled';
    recipientEmail: string;
    scheduleDateTime: string | null;
    statsConfigurations?: StatsConfiguration[];
    dynamicStats?: DynamicStatsData[];
    suppressionBreakdown?: SuppressionBreakdown[];
}

export interface ApiResponse {
    success: boolean;
    totalRequests: number;
    data: ReportData[];
    Counts: {
        TodayRequests: number;
        Waiting: number;
        Inprogress: number;
        Completed: number;
    };
}

export interface ReportListResponse {
    data: Report[];
    total: number;
    page: number;
    limit: number;
}

export interface ReportCreateRequest {
    name: string;
    description?: string;
    type: string;
    configuration: any;
    [key: string]: unknown;
}

export interface PaginationParams {
    offset: number;
    limit: number;
    [key: string]: unknown;
}

export async function getAllReports(params?: PaginationParams): Promise<ApiResponse> {
    const response = await ApiService.fetchData<ApiResponse>({
        url: '/report.php',
        method: 'post',
        data: params || { offset: 0, limit: 10 },
    });
    // Return the full response data structure with success, data, totalRequests, and Counts
    // Don't use transform() as it strips away the success and Counts properties
    return response?.data as ApiResponse;
}

export async function getRequestById(requestId: number): Promise<ReportData | null> {
    console.log('[getRequestById] Fetching request with ID:', requestId);
    const response = await ApiService.fetchData<{ success: boolean; data: ReportData[] }>({
        url: '/report.php',
        method: 'post',
        data: { requestId },
    });
    console.log('[getRequestById] Raw API response:', response);
    console.log('[getRequestById] response.data:', response?.data);
    console.log('[getRequestById] response.data.data:', response?.data?.data);
    // The API returns an array with one item when requesting by ID
    if (response?.data?.success && response?.data?.data?.length > 0) {
        const requestData = response.data.data[0];
        console.log('[getRequestById] Returning request data:', requestData);
        console.log('[getRequestById] statsConfigurations:', requestData.statsConfigurations);
        return requestData;
    }
    console.log('[getRequestById] No data found, returning null');
    return null;
}

export interface RequestStatsResponse {
    success: boolean;
    configId: number;
    stats: any[];
    message?: string;
}

export async function getRequestStats(requestId: number, configId: number): Promise<RequestStatsResponse> {
    const response = await ApiService.fetchData<RequestStatsResponse>({
        url: '/getRequestStats.php',
        method: 'post',
        data: { requestId , configId },
    });
    return response?.data as RequestStatsResponse;
}

export interface GenerateDynamicStatsRequest {
    requestId: number;
    inputSource: string;
    countsOn: string;
    breakdownBy: string;
    distinctFields: string[];
    [key: string]: unknown;
}

export interface GenerateDynamicStatsResponse {
    success: boolean;
    data: any[];
    message?: string;
}

export async function generateDynamicStats(payload: GenerateDynamicStatsRequest): Promise<GenerateDynamicStatsResponse> {
    const response = await ApiService.fetchData<GenerateDynamicStatsResponse>({
        url: '/generateDynamicStats.php',
        method: 'post',
        data: payload,
    });
    return response?.data as GenerateDynamicStatsResponse;
}

export async function getReportById(id: string): Promise<Report | null> {
    const response = await ApiService.fetchData<{ data: Report }>({
        url: `/reports/${id}`,
        method: 'get',
    });
    return ApiService.transform<Report>(response?.data?.data);
}

export async function createReport(payload: ReportCreateRequest): Promise<Report> {
    try {
        const response = await ApiService.fetchData<{ data: Report }>({
            url: '/reports',
            method: 'post',
            data: payload,
        });
        return ApiService.transform<Report>(response?.data?.data);
    } catch (error) {
        throw error;
    }
}

export async function updateReport(id: string, payload: Partial<ReportCreateRequest>): Promise<Report> {
    try {
        const response = await ApiService.fetchData<{ data: Report }>({
            url: `/reports/${id}`,
            method: 'put',
            data: payload,
        });
        return ApiService.transform<Report>(response?.data?.data);
    } catch (error) {
        throw error;
    }
}