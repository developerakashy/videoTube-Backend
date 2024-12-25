class ApiResponse{
    constructor(statusCode, data, message = 'success'){
        this.statusCode = 200,
        this.data = data
        this.message = message
        this.success = statusCode < 400

    }
}

export { ApiResponse }
