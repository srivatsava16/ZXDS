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

export async function getAllDataStreams(): Promise<DataStreamsResponse> {
    const response = await ApiService.fetchData<DataStreamsResponse>({
        url: '/dataStreams.php',
        method: 'post',
    });
    return response?.data as DataStreamsResponse;
}
