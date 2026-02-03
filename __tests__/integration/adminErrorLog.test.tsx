import { logApiError, logError, serializeHeaders } from "@/lib/error-log";

const insertMock = jest.fn().mockResolvedValue({ error: null });
const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
const createSupabaseServiceClientMock = jest.fn().mockReturnValue({
  from: fromMock,
});

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => createSupabaseServiceClientMock(),
}));

jest.mock("@/lib/ip-utils", () => ({
  resolveClientIp: jest.fn(() => "127.0.0.1"),
}));

/** Flush pending promises so void logError() runs */
function flushPromises(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/** Minimal Request-like object (jsdom has no global Request) */
function createRequest(
  method: string,
  path = "https://app.example.com/api/test",
): Request {
  return {
    method,
    url: path,
    headers: {
      get: (name: string) => (name === "user-agent" ? "Jest" : null),
      forEach: (cb: (value: string, key: string) => void) => {
        cb("Jest", "user-agent");
      },
    },
  } as unknown as Request;
}

describe("lib/error-log", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("serializeHeaders", () => {
    it("converts Headers to plain object", () => {
      const headers = new Headers({
        "content-type": "application/json",
        "x-foo": "bar",
      });
      expect(serializeHeaders(headers)).toEqual({
        "content-type": "application/json",
        "x-foo": "bar",
      });
    });

    it("returns empty object for empty Headers", () => {
      expect(serializeHeaders(new Headers())).toEqual({});
    });
  });

  describe("logError", () => {
    it("inserts payload into error_log_table via Supabase", async () => {
      await logError({
        errorType: "API_ERROR",
        errorMessage: "Test error",
        requestPath: "/api/test",
        requestMethod: "POST",
        responseStatus: 500,
      });

      expect(createSupabaseServiceClientMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith("error_log_table");
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "API_ERROR",
          error_message: "Test error",
          request_path: "/api/test",
          request_method: "POST",
          response_status: 500,
          user_id: null,
          error_code: null,
          error_stack: null,
          request_body: null,
          request_headers: null,
          error_details: null,
          ip_address: null,
          user_agent: null,
        }),
      );
    });

    it("includes optional fields when provided", async () => {
      await logError({
        errorType: "VALIDATION_ERROR",
        errorMessage: "Bad input",
        errorCode: "VALIDATION_FIELD_REQUIRED",
        errorStack: "Error: Bad input\n  at fn (file.ts:1:1)",
        requestPath: "/api/users",
        requestMethod: "PATCH",
        requestBody: { name: "x" },
        requestHeaders: { "content-type": "application/json" },
        responseStatus: 400,
        errorDetails: { field: "email" },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        userId: "user-uuid-123",
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "VALIDATION_ERROR",
          error_message: "Bad input",
          error_code: "VALIDATION_FIELD_REQUIRED",
          error_stack: "Error: Bad input\n  at fn (file.ts:1:1)",
          request_path: "/api/users",
          request_method: "PATCH",
          request_body: { name: "x" },
          request_headers: { "content-type": "application/json" },
          response_status: 400,
          error_details: { field: "email" },
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
          user_id: "user-uuid-123",
        }),
      );
    });
  });

  describe("logApiError", () => {
    it("does not log when status is 401", async () => {
      const req = createRequest("POST");
      logApiError(req, { status: 401, message: "Unauthorized" });
      await flushPromises();
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("does not log when status is 403", async () => {
      const req = createRequest("POST");
      logApiError(req, { status: 403, message: "Forbidden" });
      await flushPromises();
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("does not log when method is GET", async () => {
      const req = createRequest("GET");
      logApiError(req, { status: 500, message: "Server error" });
      await flushPromises();
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("does not log when method is HEAD", async () => {
      const req = createRequest("HEAD");
      logApiError(req, { status: 500, message: "Server error" });
      await flushPromises();
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("logs when method is POST and status is 500", async () => {
      const req = createRequest("POST", "https://app.example.com/api/items");
      logApiError(req, { status: 500, message: "Server error" });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "SYSTEM_ERROR",
          error_message: "Server error",
          request_path: "/api/items",
          request_method: "POST",
          response_status: 500,
          ip_address: "127.0.0.1",
          user_agent: "Jest",
        }),
      );
    });

    it("logs when method is PATCH and status is 400", async () => {
      const req = createRequest(
        "PATCH",
        "https://app.example.com/api/admin/error-logs/123",
      );
      logApiError(req, {
        status: 400,
        message: "Invalid error log id.",
        errorCode: "VALIDATION_ERROR",
      });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "VALIDATION_ERROR",
          error_message: "Invalid error log id.",
          error_code: "VALIDATION_ERROR",
          request_method: "PATCH",
          response_status: 400,
        }),
      );
    });

    it("logs when method is DELETE and status is 404", async () => {
      const req = createRequest(
        "DELETE",
        "https://app.example.com/api/resources/456",
      );
      logApiError(req, { status: 404, message: "Resource not found" });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "VALIDATION_ERROR",
          error_message: "Resource not found",
          request_method: "DELETE",
          response_status: 404,
        }),
      );
    });

    it("includes error stack when options.error is an Error", async () => {
      const req = createRequest("POST");
      const err = new Error("Something broke");
      logApiError(req, { status: 500, message: err.message, error: err });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_message: "Something broke",
          error_stack: expect.stringContaining("Something broke"),
        }),
      );
    });

    it("includes errorDetails and userId when provided", async () => {
      const req = createRequest("POST");
      logApiError(req, {
        status: 500,
        message: "Failed",
        errorDetails: { step: "payment" },
        userId: "user-789",
      });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_details: { step: "payment" },
          user_id: "user-789",
        }),
      );
    });

    it("uses custom errorCode when provided", async () => {
      const req = createRequest("POST");
      logApiError(req, {
        status: 500,
        message: "PayMongo failed",
        errorCode: "PAYMENT_ERROR",
      });
      await flushPromises();
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: "PAYMENT_ERROR",
        }),
      );
    });
  });
});
