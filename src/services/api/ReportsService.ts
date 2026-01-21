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