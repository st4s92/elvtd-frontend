interface PaginationResponseData<T> {
    data: T[],
    total: number
}

export interface PaginationResponse<T> {
    status: boolean,
    code: number,
    data: PaginationResponseData<T>
    message: string
}