import ApiService from './ApiService';

export interface DataStream {
    id: number;
    name: string;
    sourceCategory: string;
    createdBy: string;
    createdDate: string;
    updatedBy: string;
    updatedDate: string;
    processStatus: string;
    sourceTypeCode: string;
    sourceType: string;
    // SFTP/NFS fields
    hostname?: string | null;
    port?: number;
    fileUsername?: string | null;
    filePassword?: string;
    defaultPath?: string | null;
    // AWS S3 fields
    bucketName?: string | null;
    region?: string | null;
    accessKey?: string;
    secretKey?: string;
}

export interface DataStreamsResponse {
    success: boolean;
    data: DataStream[];
}

// Payload interfaces for data stream creation
export interface CreateDataStreamPayload extends Record<string, unknown> {
    operation: 'Add';
    dataStreamName: string;
    sourceCategory: 'F';
    sourceType: 'S' | 'A'; // S = SFTP, A = AWS
    // SFTP fields
    hostName?: string;
    port?: number;
    userName?: string;
    password?: string;
    defaultDirectory?: string;
    // AWS fields
    bucketName?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
    createdBy: string;
}

// Payload interface for data stream update
export interface UpdateDataStreamPayload extends Record<string, unknown> {
    operation: 'Update';
    dataSourceId: number;
    sourceType: 'S' | 'A'; // S = SFTP, A = AWS
    // SFTP fields
    hostName?: string;
    port?: number;
    userName?: string;
    password?: string;
    defaultDirectory?: string;
    // AWS fields
    bucketName?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
    updatedBy: string;
}

export interface CreateDataStreamResponse {
    success: boolean;
    message: string;
    data?: any;
}

export async function getAllDataStreams(): Promise<DataStreamsResponse> {
    const response = await ApiService.fetchData<DataStreamsResponse>({
        url: '/dataStreams.php',
        method: 'post',
    });
    return response?.data as DataStreamsResponse;
}

export async function createDataStream(payload: CreateDataStreamPayload): Promise<CreateDataStreamResponse> {
    const response = await ApiService.fetchData<CreateDataStreamResponse>({
        url: '/dataStreams.php',
        method: 'post',
        data: payload,
    });
    return response?.data as CreateDataStreamResponse;
}

export async function updateDataStream(payload: UpdateDataStreamPayload): Promise<CreateDataStreamResponse> {
    const response = await ApiService.fetchData<CreateDataStreamResponse>({
        url: '/dataStreams.php',
        method: 'post',
        data: payload,
    });
    return response?.data as CreateDataStreamResponse;
}
