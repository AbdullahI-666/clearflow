export class ApiResponse<T = any> {
  public success: boolean;
  public statusCode: number;
  public data?: T;
  public message?: string;
  public pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  constructor(statusCodeOrData?: number | T, dataOrMessage?: any, message?: string) {
    this.success = true;

    if (typeof statusCodeOrData === 'number') {
      this.statusCode = statusCodeOrData;
      this.data = dataOrMessage;
      this.message = message || 'Success';
    } else {
      this.statusCode = 200;
      this.data = statusCodeOrData as T;
      this.message = (dataOrMessage as string) || 'Success';
    }
  }

  static success<T>(data?: T, message = 'Success') {
    return new ApiResponse<T>(200, data, message);
  }

  static created<T>(data?: T, message = 'Created') {
    return new ApiResponse<T>(201, data, message);
  }

  static paginated<T>(data: T, page: number, limit: number, total: number, message = 'Success') {
    const res = new ApiResponse<T>(200, data, message);
    res.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
    return res;
  }
}
