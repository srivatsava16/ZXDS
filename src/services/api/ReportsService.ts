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

// Get today's date for mock data
const today = new Date().toISOString().split('T')[0];

// Mock data for fallback
function getMockReports(): Report[] {
    return [
        {
            id: '1',
            name: 'Sprint Q1 2024 Report',
            description: 'Quarterly sprint analysis',
            createdAt: `${today}T09:30:00Z`,
            updatedAt: `${today}T10:45:00Z`,
            status: 'active',
            type: 'universal-pull'
        },
        {
            id: '2',
            name: 'Verizon March Report',
            description: 'Monthly Verizon data analysis',
            createdAt: '2024-03-01T08:15:00Z',
            updatedAt: '2024-03-02T09:20:00Z',
            status: 'active',
            type: 'universal-pull'
        },
        {
            id: '3',
            name: 'Credit One Analysis',
            description: 'Credit analysis report',
            createdAt: `${today}T11:00:00Z`,
            updatedAt: `${today}T11:30:00Z`,
            status: 'pending',
            type: 'universal-pull'
        },
        {
            id: '4',
            name: 'AT&T Customer Data Pull',
            description: 'Customer data extraction for AT&T',
            createdAt: `${today}T14:20:00Z`,
            updatedAt: `${today}T14:20:00Z`,
            status: 'pending',
            type: 'universal-pull'
        },
        {
            id: '5',
            name: 'T-Mobile Weekly Report',
            description: 'Weekly performance metrics',
            createdAt: `${today}T07:45:00Z`,
            updatedAt: `${today}T08:30:00Z`,
            status: 'active',
            type: 'data-stream'
        }
    ];
}

// Fallback mock data for API failures
function getMockApiResponse(): ApiResponse {
    return {
        success: true,
        data: [
            {
                id: 1,
                requestName: 'Sprint Q1 2024',
                createdDate: `${today} 09:30:00`,
                processedDate: `${today} 10:45:00`,
                createdBy: 'Ranjith Ranga',
                updatedBy: 'Ranjith Ranga',
                updatedDate: `${today} 10:45:00`,
                status: 'Completed',
                requestType: 'Adhoc',
                recipientEmail: 'ranjith.ranga@company.com',
                scheduleDateTime: `${today} 09:30:00`,
            },
            {
                id: 2,
                requestName: 'Verizon March',
                createdDate: '2024-03-01 08:15:00',
                processedDate: '2024-03-02 09:20:00',
                createdBy: 'Ranjith Ranga',
                updatedBy: 'Ranjith Ranga',
                updatedDate: '2024-03-02 09:20:00',
                status: 'Completed',
                requestType: 'Scheduled',
                recipientEmail: 'ranjith.ranga@company.com',
                scheduleDateTime: '2024-03-01 08:15:00',
            },
            {
                id: 3,
                requestName: 'Credit One Analysis',
                createdDate: `${today} 11:00:00`,
                processedDate: null,
                createdBy: 'Ranjith Ranga',
                updatedBy: 'Ranjith Ranga',
                updatedDate: `${today} 11:30:00`,
                status: 'Inprogress',
                requestType: 'Adhoc',
                recipientEmail: 'ranjith.ranga@company.com',
                scheduleDateTime: `${today} 11:00:00`,
            },
            {
                id: 4,
                requestName: 'AT&T Customer Data',
                createdDate: `${today} 14:20:00`,
                processedDate: null,
                createdBy: 'Sarah Johnson',
                updatedBy: 'Sarah Johnson',
                updatedDate: `${today} 14:20:00`,
                status: 'Pending',
                requestType: 'Adhoc',
                recipientEmail: 'sarah.johnson@company.com',
                scheduleDateTime: `${today} 14:20:00`,
            },
            {
                id: 5,
                requestName: 'T-Mobile Weekly Report',
                createdDate: `${today} 07:45:00`,
                processedDate: `${today} 08:30:00`,
                createdBy: 'Mike Chen',
                updatedBy: 'Mike Chen',
                updatedDate: `${today} 08:30:00`,
                status: 'Completed',
                requestType: 'Scheduled',
                recipientEmail: 'mike.chen@company.com',
                scheduleDateTime: `${today} 07:45:00`,
            },
            {
                id: 6,
                requestName: 'Bank of America Analysis',
                createdDate: '2024-12-28 16:30:00',
                processedDate: null,
                createdBy: 'Lisa Rodriguez',
                updatedBy: 'Lisa Rodriguez',
                updatedDate: '2024-12-28 16:30:00',
                status: 'Inprogress',
                requestType: 'Adhoc',
                recipientEmail: 'lisa.rodriguez@company.com',
                scheduleDateTime: '2024-12-28 16:30:00',
            },
            {
                id: 7,
                requestName: 'Walmart Customer Insights',
                createdDate: '2024-12-27 10:15:00',
                processedDate: '2024-12-27 12:45:00',
                createdBy: 'David Kim',
                updatedBy: 'David Kim',
                updatedDate: '2024-12-27 12:45:00',
                status: 'Completed',
                requestType: 'Scheduled',
                recipientEmail: 'david.kim@company.com',
                scheduleDateTime: '2024-12-27 10:15:00',
            },
            {
                id: 8,
                requestName: 'Amazon Prime Data Pull',
                createdDate: `${today} 15:45:00`,
                processedDate: null,
                createdBy: 'Jennifer Lee',
                updatedBy: 'Jennifer Lee',
                updatedDate: `${today} 15:45:00`,
                status: 'Waiting',
                requestType: 'Adhoc',
                recipientEmail: 'jennifer.lee@company.com',
                scheduleDateTime: `${today} 15:45:00`,
            },
            {
                id: 9,
                requestName: 'Netflix Subscriber Analysis',
                createdDate: `${today} 12:20:00`,
                processedDate: `${today} 13:15:00`,
                createdBy: 'Robert Wilson',
                updatedBy: 'Robert Wilson',
                updatedDate: `${today} 13:15:00`,
                status: 'Completed',
                requestType: 'Adhoc',
                recipientEmail: 'robert.wilson@company.com',
                scheduleDateTime: `${today} 12:20:00`,
            },
            {
                id: 10,
                requestName: 'Tesla Sales Report',
                createdDate: '2024-12-26 09:00:00',
                processedDate: null,
                createdBy: 'Emily Davis',
                updatedBy: 'Emily Davis',
                updatedDate: '2024-12-26 09:00:00',
                status: 'Failed',
                requestType: 'Scheduled',
                recipientEmail: 'emily.davis@company.com',
                scheduleDateTime: '2024-12-26 09:00:00',
            },
            {
                id: 11,
                requestName: 'Google Analytics Export',
                createdDate: `${today} 08:10:00`,
                processedDate: null,
                createdBy: 'Alex Thompson',
                updatedBy: 'Alex Thompson',
                updatedDate: `${today} 08:10:00`,
                status: 'Inprogress',
                requestType: 'Adhoc',
                recipientEmail: 'alex.thompson@company.com',
                scheduleDateTime: `${today} 08:10:00`,
            },
            {
                id: 12,
                requestName: 'Microsoft Azure Usage',
                createdDate: `${today} 16:25:00`,
                processedDate: null,
                createdBy: 'Rachel Green',
                updatedBy: 'Rachel Green',
                updatedDate: `${today} 16:25:00`,
                status: 'Pending',
                requestType: 'Scheduled',
                recipientEmail: 'rachel.green@company.com',
                scheduleDateTime: `${today} 16:25:00`,
            },
            {
                id: 13,
                requestName: 'Oracle Database Sync',
                createdDate: `${today} 13:40:00`,
                processedDate: null,
                createdBy: 'James Wilson',
                updatedBy: 'James Wilson',
                updatedDate: `${today} 13:40:00`,
                status: 'Waiting',
                requestType: 'Adhoc',
                recipientEmail: 'james.wilson@company.com',
                scheduleDateTime: `${today} 13:40:00`,
            },
            {
                id: 14,
                requestName: 'Monthly Customer Report',
                createdDate: `${today} 10:15:30`,
                processedDate: null,
                createdBy: 'John Smith',
                updatedBy: 'John Smith',
                updatedDate: `${today} 11:20:45`,
                status: 'Inprogress',
                requestType: 'Scheduled',
                recipientEmail: 'john.smith@company.com',
                scheduleDateTime: '2025-12-30 02:00:00',
            },
            {
                id: 15,
                requestName: 'Sprint Q4 2025 Analytics Export',
                createdDate: `${today} 14:30:15`,
                processedDate: `${today} 15:45:22`,
                createdBy: 'Ranjith Ranga',
                updatedBy: 'System Admin',
                updatedDate: `${today} 15:45:22`,
                status: 'Completed',
                requestType: 'Adhoc',
                recipientEmail: 'ranjith.ranga@company.com',
                scheduleDateTime: `${today} 14:30:15`,
            },
            {
                id: 16,
                requestName: 'Facebook Ads Performance',
                createdDate: '2024-12-25 11:30:00',
                processedDate: '2024-12-25 12:15:00',
                createdBy: 'Marketing Team',
                updatedBy: 'Marketing Team',
                updatedDate: '2024-12-25 12:15:00',
                status: 'Completed',
                requestType: 'Adhoc',
                recipientEmail: 'marketing@company.com',
                scheduleDateTime: '2024-12-25 11:30:00',
            },
            {
                id: 17,
                requestName: 'Shopify Sales Analysis',
                createdDate: '2024-12-24 09:45:00',
                processedDate: '2024-12-24 10:30:00',
                createdBy: 'E-commerce Team',
                updatedBy: 'E-commerce Team',
                updatedDate: '2024-12-24 10:30:00',
                status: 'Completed',
                requestType: 'Scheduled',
                recipientEmail: 'ecommerce@company.com',
                scheduleDateTime: '2024-12-24 09:45:00',
            },
            {
                id: 18,
                requestName: 'LinkedIn Lead Generation',
                createdDate: '2024-12-23 14:20:00',
                processedDate: null,
                createdBy: 'Sales Team',
                updatedBy: 'Sales Team',
                updatedDate: '2024-12-23 15:10:00',
                status: 'Failed',
                requestType: 'Adhoc',
                recipientEmail: 'sales@company.com',
                scheduleDateTime: '2024-12-23 14:20:00',
            },
            {
                id: 19,
                requestName: 'Salesforce CRM Export',
                createdDate: '2024-12-22 08:00:00',
                processedDate: null,
                createdBy: 'CRM Admin',
                updatedBy: 'CRM Admin',
                updatedDate: '2024-12-22 09:30:00',
                status: 'Pending',
                requestType: 'Scheduled',
                recipientEmail: 'crm.admin@company.com',
                scheduleDateTime: '2024-12-22 08:00:00',
            },
            {
                id: 20,
                requestName: 'HubSpot Marketing Data',
                createdDate: '2024-12-21 16:45:00',
                processedDate: '2024-12-21 17:20:00',
                createdBy: 'Digital Marketing',
                updatedBy: 'Digital Marketing',
                updatedDate: '2024-12-21 17:20:00',
                status: 'Completed',
                requestType: 'Adhoc',
                recipientEmail: 'digital.marketing@company.com',
                scheduleDateTime: '2024-12-21 16:45:00',
            }
        ],
        Counts: {
            TodayRequests: 12,
            Waiting: 2,
            Inprogress: 4,
            Completed: 8,
        }
    };
}

export async function getAllReports(): Promise<ApiResponse> {
    const response = await ApiService.fetchData<ApiResponse>({
        url: '/report.php',
        method: 'get',
    });
    return ApiService.transform<ApiResponse>(response?.data);
}

// Export mock data function for fallback use in components
export function getMockReportsData(): ApiResponse {
    return getMockApiResponse();
}

export async function getReportById(id: string): Promise<Report | null> {
    try {
        const response = await ApiService.fetchData<{ data: Report }>({
            url: `/reports/${id}`,
            method: 'get',
        });
        return ApiService.transform<Report>(response?.data?.data);
    } catch (error) {
        console.error(`Error fetching report ${id}:`, error);
        // Return fallback mock data
        const mockReports = getMockReports();
        return mockReports.find((report: Report) => report.id === id) || null;
    }
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
        console.error('Error creating report:', error);
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
        console.error(`Error updating report ${id}:`, error);
        throw error;
    }
}