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

export interface DynamicStatsInputSource {
    id: number;
    inputSource: string;
    headers: string[];
}

export interface DynamicStats {
    data: DynamicStatsInputSource[];
    preconfiguredDynamicStats: any[];
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
    dynamicStats?: DynamicStats; // Updated to match actual API structure
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
    const response = await ApiService.fetchData<any>({
        url: '/report.php',
        method: 'post',
        data: params || { offset: 0, limit: 10 },
    });

    // Transform preconfiguredStats to statsConfigurations for backward compatibility
    const apiResponse = response?.data;
    console.log('[getAllReports] Raw API response data:', apiResponse?.data);

    if (apiResponse?.data && Array.isArray(apiResponse?.data)) {
        apiResponse.data = apiResponse?.data?.map((item: any) => {
            console.log('[getAllReports] Transforming item:', {
                id: item?.id,
                hasPreconfiguredStats: !!item?.preconfiguredStats,
                hasStatsConfigurations: !!item?.statsConfigurations,
                preconfiguredStats: item?.preconfiguredStats,
                statsConfigurations: item?.statsConfigurations
            });

            return {
                ...item,
                statsConfigurations: item?.preconfiguredStats || item?.statsConfigurations || [],
                suppressionBreakdown: item?.suppressionBreakDown || item?.suppressionBreakdown || []
            };
        });

        console.log('[getAllReports] Transformed data:', apiResponse?.data);
    }

    // Return the full response data structure with success, data, totalRequests, and Counts
    // Don't use transform() as it strips away the success and Counts properties
    return apiResponse as ApiResponse;
}

export async function getRequestById(requestId: number): Promise<ReportData | null> {
    console.log('[getRequestById] Fetching request with ID:', requestId);
    const response = await ApiService.fetchData<any>({
        url: '/report.php',
        method: 'post',
        data: { requestId },
    });
    console.log('[getRequestById] Raw API response:', response);
    console.log('[getRequestById] response.data:', response?.data);

    if (response?.data?.success) {
        // Check if the response has the detailed format (with inputSources at root level)
        if (response?.data?.inputSources || response?.data?.requestDetails) {
            console.log('[getRequestById] Using detailed format with inputSources');
            console.log('[getRequestById] inputSources:', response?.data?.inputSources);
            console.log('[getRequestById] workflow:', response?.data?.workflow);
            console.log('[getRequestById] stats:', response?.data?.stats);
            console.log('[getRequestById] output:', response?.data?.output);

            // Return the data as-is, including inputSources, workflow, stats, output
            return response?.data;
        }

        // Fallback: Check if response has data array (list format)
        if (response?.data?.data && Array.isArray(response?.data?.data) && response?.data?.data?.length > 0) {
            console.log('[getRequestById] Using list format, finding record by ID:', requestId);

            // Find the specific record that matches the requestId
            const rawData = response?.data?.data?.find((record: any) => record?.id === requestId);

            if (!rawData) {
                console.warn('[getRequestById] Record not found in list for ID:', requestId);
                return null;
            }

            console.log('[getRequestById] Found record:', rawData);
            console.log('[getRequestById] Raw preconfiguredStats:', rawData?.preconfiguredStats);
            console.log('[getRequestById] Raw dynamicStats:', rawData?.dynamicStats);

            // Transform API field names for backward compatibility
            const requestData: ReportData = {
                ...rawData,
                statsConfigurations: rawData?.preconfiguredStats || rawData?.statsConfigurations || [],
                suppressionBreakdown: rawData?.suppressionBreakDown || rawData?.suppressionBreakdown || []
            };

            console.log('[getRequestById] Transformed request data:', requestData);
            console.log('[getRequestById] Final statsConfigurations:', requestData?.statsConfigurations);
            console.log('[getRequestById] statsConfigurations length:', requestData?.statsConfigurations?.length);
            console.log('[getRequestById] suppressionBreakdown:', requestData?.suppressionBreakdown);
            return requestData;
        }
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

export interface ReportInsertsRequest {
    requestId: number;
    stats?: Array<{
        input_sources: Array<{
            source_name: string;
            columns: string[];
        }>;
        generate_counts_config: {
            counts: Array<{
                field: string;
                is_distinct: boolean;
            }>;
        };
        breakdown_by: string[];
    }>;
    output?: Array<{
        config: {
            input_sources: string[];
            output_fields: string[];
            field_mappings: any[];
            combine_sources: boolean;
            field_priority: string[];
        };
        destinationType: 'preconfigured' | 'custom';
        destinationName?: string;  // Only for preconfigured
        destinationConfig?: {  // Only for custom
            type: 'SFTP' | 'S3' | 'NFS';
            // SFTP fields
            hostname?: string;
            port?: number;
            path?: string;
            username?: string;
            password?: string;
            // S3 fields
            bucketname?: string;
            region?: string;
            accesskey?: string;
            // NFS fields
            hostserver?: string;
            mountpath?: string;
        };
        limitations: {
            limit_records: number | null;
            shuffle_records: boolean;
        };
    }>;
    status?: string;  // For STOP action
    [key: string]: unknown;
}

export interface ReportInsertsResponse {
    success: boolean;
    data: any[];
    message?: string;
}

export async function reportInserts(payload: ReportInsertsRequest): Promise<ReportInsertsResponse> {
    const response = await ApiService.fetchData<ReportInsertsResponse>({
        url: '/reportInserts.php',
        method: 'post',
        data: payload,
    });
    return response?.data as ReportInsertsResponse;
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