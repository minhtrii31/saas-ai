const successEnvelope = (dataSchema: unknown) => ({
  type: "object",
  required: ["data", "meta"],
  properties: {
    data: dataSchema,
    meta: { $ref: "#/components/schemas/ApiMeta" },
  },
})

const jsonRequestBody = (schemaRef: string) => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: schemaRef },
    },
  },
})

const jsonResponse = (description: string, dataSchema: unknown) => ({
  description,
  content: {
    "application/json": {
      schema: successEnvelope(dataSchema),
    },
  },
})

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiError" },
    },
  },
})

const pathIdParameter = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
})

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "SaaS AI CV API",
    version: "0.3.0",
    description:
      "Public API contract for account lifecycle, CV parsing, analysis, job matching, generated documents, health, and readiness endpoints.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Account" },
    { name: "CVs" },
    { name: "Analyses" },
    { name: "Jobs" },
    { name: "Comparisons" },
    { name: "Documents" },
    { name: "Docs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      refreshCookie: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
      },
    },
    parameters: {
      page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      pageSize: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      sortOrder: {
        name: "sortOrder",
        in: "query",
        schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
      },
    },
    schemas: {
      ApiMeta: {
        type: "object",
        required: ["requestId"],
        properties: {
          requestId: { type: "string" },
        },
      },
      ApiError: {
        type: "object",
        required: ["error", "meta"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {},
            },
          },
          meta: { $ref: "#/components/schemas/ApiMeta" },
        },
      },
      Pagination: {
        type: "object",
        required: [
          "page",
          "pageSize",
          "totalItems",
          "totalPages",
          "hasNextPage",
          "hasPreviousPage",
        ],
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          totalItems: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 0 },
          hasNextPage: { type: "boolean" },
          hasPreviousPage: { type: "boolean" },
        },
      },
      PublicUser: {
        type: "object",
        required: ["id", "email", "role", "emailVerified", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          avatarUrl: { type: "string", format: "uri" },
          role: { type: "string", enum: ["user", "admin"] },
          emailVerified: { type: "boolean" },
          emailVerifiedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthSession: {
        type: "object",
        required: ["user", "accessToken"],
        properties: {
          user: { $ref: "#/components/schemas/PublicUser" },
          accessToken: { type: "string" },
        },
      },
      AiUsage: {
        type: "object",
        properties: {
          inputTokens: { type: "integer", minimum: 0 },
          outputTokens: { type: "integer", minimum: 0 },
          totalTokens: { type: "integer", minimum: 0 },
        },
      },
      AiMetadata: {
        type: "object",
        required: ["provider", "modelName", "promptVersion", "promptFamily", "validationStatus"],
        properties: {
          provider: { type: "string", enum: ["gemini"] },
          modelName: { type: "string" },
          promptVersion: { type: "string" },
          promptFamily: { type: "string" },
          requestId: { type: "string" },
          usage: { $ref: "#/components/schemas/AiUsage" },
          durationMs: { type: "number", minimum: 0 },
          validationStatus: { type: "string", enum: ["valid"] },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 128 },
          name: { type: "string", minLength: 1, maxLength: 120 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1, maxLength: 128 },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: ["string", "null"], maxLength: 120 },
          avatarUrl: { type: ["string", "null"], format: "uri", maxLength: 2048 },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", minLength: 1, maxLength: 128 },
          newPassword: { type: "string", minLength: 8, maxLength: 128 },
        },
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      CompletePasswordResetRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string", minLength: 32, maxLength: 256 },
          newPassword: { type: "string", minLength: 8, maxLength: 128 },
        },
      },
      CompleteEmailVerificationRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", minLength: 32, maxLength: 256 },
        },
      },
      AcceptedResponse: {
        type: "object",
        properties: {
          accepted: { type: "boolean", const: true },
          token: { type: "string", description: "Only returned outside production when configured." },
        },
      },
      LogoutResponse: {
        type: "object",
        required: ["loggedOut"],
        properties: { loggedOut: { type: "boolean", const: true } },
      },
      Health: {
        type: "object",
        required: ["status", "service"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string", enum: ["saas-ai-api"] },
        },
      },
      Ready: {
        type: "object",
        required: ["status", "checks"],
        properties: {
          status: { type: "string", enum: ["ready", "not_ready"] },
          checks: {
            type: "object",
            required: ["app", "database", "redis"],
            properties: {
              app: { type: "string", enum: ["ready"] },
              database: { type: "string" },
              redis: { type: "string" },
            },
          },
        },
      },
      CvParserMetadata: {
        type: "object",
        required: ["parser", "characterCount"],
        properties: {
          parser: { type: "string", enum: ["pdf-parse", "mammoth"] },
          pageCount: { type: "integer", minimum: 0 },
          characterCount: { type: "integer", minimum: 0 },
          warnings: { type: "array", items: { type: "string" } },
        },
      },
      Cv: {
        type: "object",
        required: [
          "id",
          "title",
          "originalFileName",
          "mimeType",
          "fileSize",
          "storageProvider",
          "uploadStatus",
          "parserStatus",
          "retentionStatus",
          "uploadedAt",
          "createdAt",
          "updatedAt",
          "hasParsedText",
          "parsedTextCharacterCount",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          originalFileName: { type: "string" },
          mimeType: { type: "string" },
          fileSize: { type: "integer", minimum: 0 },
          storageProvider: { type: "string", enum: ["cloudinary"] },
          uploadStatus: { type: "string", enum: ["uploaded"] },
          parserStatus: { type: "string", enum: ["pending", "parsed", "failed"] },
          parserError: { type: "string" },
          parserMetadata: { $ref: "#/components/schemas/CvParserMetadata" },
          retentionStatus: {
            type: "string",
            enum: ["retained_for_retry", "storage_deletion_failed", "ready_for_cleanup"],
          },
          storageDeletionAttemptedAt: { type: "string", format: "date-time" },
          uploadedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          hasParsedText: { type: "boolean" },
          parsedTextCharacterCount: { type: "integer", minimum: 0 },
          parsedText: { type: "string" },
        },
      },
      JobDescription: {
        type: "object",
        required: [
          "id",
          "userId",
          "title",
          "descriptionTextCharacterCount",
          "hasDescriptionText",
          "inputType",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          title: { type: "string" },
          company: { type: "string" },
          descriptionText: { type: "string" },
          descriptionTextCharacterCount: { type: "integer", minimum: 0 },
          hasDescriptionText: { type: "boolean" },
          inputType: { type: "string", enum: ["pasted"] },
          sourceUrl: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateJobDescriptionRequest: {
        type: "object",
        additionalProperties: false,
        required: ["title", "descriptionText"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 160 },
          company: { type: "string", maxLength: 120 },
          descriptionText: { type: "string", minLength: 1, maxLength: 10000 },
          sourceUrl: { type: "string", maxLength: 500 },
        },
      },
      UpdateJobDescriptionRequest: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 160 },
          company: { type: "string", maxLength: 120 },
          descriptionText: { type: "string", minLength: 1, maxLength: 10000 },
          sourceUrl: { type: "string", maxLength: 500 },
        },
      },
      StructuredAnalysis: {
        type: "object",
        properties: {
          summary: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          experienceHighlights: { type: "array", items: { type: "string" } },
          education: { type: "array", items: { type: "string" } },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          improvements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "string", enum: ["low", "medium", "high"] },
                suggestion: { type: "string" },
                reason: { type: "string" },
              },
            },
          },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
      Analysis: {
        type: "object",
        required: ["id", "userId", "cvId", "analysisStatus", "analyzedAt", "aiMetadata", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          cvId: { type: "string" },
          analysisStatus: { type: "string", enum: ["completed"] },
          analyzedAt: { type: "string", format: "date-time" },
          structuredAnalysis: { $ref: "#/components/schemas/StructuredAnalysis" },
          aiMetadata: { $ref: "#/components/schemas/AiMetadata" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          summary: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          skillCount: { type: "integer", minimum: 0 },
          strengthCount: { type: "integer", minimum: 0 },
          improvementCount: { type: "integer", minimum: 0 },
        },
      },
      CreateComparisonRequest: {
        type: "object",
        additionalProperties: false,
        required: ["cvId", "jobDescriptionId"],
        properties: {
          cvId: { type: "string" },
          jobDescriptionId: { type: "string" },
        },
      },
      StructuredComparison: {
        type: "object",
        properties: {
          fitScore: { type: "integer", minimum: 0, maximum: 100 },
          scoreReason: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          missingRequirements: { type: "array", items: { type: "string" } },
          matchedSkills: { type: "array", items: { type: "string" } },
          missingSkills: { type: "array", items: { type: "string" } },
          applicationAdvice: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          evidenceNotes: { type: "array", items: { type: "string" } },
        },
      },
      Comparison: {
        type: "object",
        required: ["id", "userId", "cvId", "jobDescriptionId", "comparisonStatus", "comparedAt", "aiMetadata", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          cvId: { type: "string" },
          jobDescriptionId: { type: "string" },
          comparisonStatus: { type: "string", enum: ["completed"] },
          comparedAt: { type: "string", format: "date-time" },
          structuredComparison: { $ref: "#/components/schemas/StructuredComparison" },
          aiMetadata: { $ref: "#/components/schemas/AiMetadata" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          fitScore: { type: "integer", minimum: 0, maximum: 100 },
          scoreReason: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          matchedSkillCount: { type: "integer", minimum: 0 },
          missingSkillCount: { type: "integer", minimum: 0 },
        },
      },
      CreateCoverLetterRequest: {
        type: "object",
        additionalProperties: false,
        required: ["cvId"],
        properties: {
          cvId: { type: "string" },
          jobDescriptionId: { type: "string" },
          comparisonId: { type: "string" },
        },
      },
      UpdateGeneratedDocumentRequest: {
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 160 },
          body: { type: "string", minLength: 80, maxLength: 8000 },
        },
      },
      GeneratedDocument: {
        type: "object",
        required: ["id", "userId", "type", "status", "title", "generatedAt", "aiMetadata", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          type: { type: "string", enum: ["cover_letter"] },
          status: { type: "string", enum: ["draft"] },
          cvId: { type: "string" },
          jobDescriptionId: { type: "string" },
          comparisonId: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          notes: { type: "array", items: { type: "string" } },
          generatedAt: { type: "string", format: "date-time" },
          aiMetadata: { $ref: "#/components/schemas/AiMetadata" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          bodyCharacterCount: { type: "integer", minimum: 0 },
          notesCount: { type: "integer", minimum: 0 },
        },
      },
      DeleteResponse: {
        type: "object",
        required: ["deleted"],
        properties: { deleted: { type: "boolean", const: true } },
      },
    },
    responses: {
      Unauthorized: errorResponse("Authentication required or invalid credentials."),
      NotFound: errorResponse("The resource was not found or is not owned by the user."),
      ValidationError: errorResponse("Request validation failed."),
      RateLimit: errorResponse("Rate limit exceeded."),
      ProviderError: errorResponse("AI provider error or invalid AI response."),
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Read API liveness status.",
        responses: {
          "200": jsonResponse("Health status.", { $ref: "#/components/schemas/Health" }),
        },
      },
    },
    "/ready": {
      get: {
        tags: ["Health"],
        summary: "Read API readiness checks.",
        responses: {
          "200": jsonResponse("Service is ready.", { $ref: "#/components/schemas/Ready" }),
          "503": jsonResponse("Service is not ready.", { $ref: "#/components/schemas/Ready" }),
        },
      },
    },
    "/api/docs/openapi.json": {
      get: {
        tags: ["Docs"],
        summary: "Read the OpenAPI document inside the standard success envelope.",
        responses: {
          "200": jsonResponse("OpenAPI document.", {
            type: "object",
            properties: { openapi: { type: "object" } },
          }),
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register an account and issue an access token plus refresh cookie.",
        requestBody: jsonRequestBody("#/components/schemas/RegisterRequest"),
        responses: {
          "201": jsonResponse("Registered session.", { $ref: "#/components/schemas/AuthSession" }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimit" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password.",
        requestBody: jsonRequestBody("#/components/schemas/LoginRequest"),
        responses: {
          "200": jsonResponse("Authenticated session.", { $ref: "#/components/schemas/AuthSession" }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimit" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate the HTTP-only refresh token and issue a new access token.",
        security: [{ refreshCookie: [] }],
        responses: {
          "200": jsonResponse("Refreshed session.", { $ref: "#/components/schemas/AuthSession" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimit" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear the active refresh token and refresh cookie.",
        responses: {
          "200": jsonResponse("Logout result.", { $ref: "#/components/schemas/LogoutResponse" }),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Account"],
        summary: "Read the current authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Current user.", {
            type: "object",
            required: ["user"],
            properties: { user: { $ref: "#/components/schemas/PublicUser" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Account"],
        summary: "Update the current user's profile metadata.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequestBody("#/components/schemas/UpdateProfileRequest"),
        responses: {
          "200": jsonResponse("Updated user.", {
            type: "object",
            required: ["user"],
            properties: { user: { $ref: "#/components/schemas/PublicUser" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/change-password": {
      post: {
        tags: ["Account"],
        summary: "Change password and issue a fresh session.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequestBody("#/components/schemas/ChangePasswordRequest"),
        responses: {
          "200": jsonResponse("Fresh session.", { $ref: "#/components/schemas/AuthSession" }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/password-reset/request": {
      post: {
        tags: ["Account"],
        summary: "Request a password reset using an enumeration-safe response.",
        requestBody: jsonRequestBody("#/components/schemas/PasswordResetRequest"),
        responses: {
          "200": jsonResponse("Accepted reset request.", { $ref: "#/components/schemas/AcceptedResponse" }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimit" },
        },
      },
    },
    "/api/auth/password-reset/complete": {
      post: {
        tags: ["Account"],
        summary: "Complete password reset with a valid reset token.",
        requestBody: jsonRequestBody("#/components/schemas/CompletePasswordResetRequest"),
        responses: {
          "200": jsonResponse("Fresh session.", { $ref: "#/components/schemas/AuthSession" }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/email-verification/request": {
      post: {
        tags: ["Account"],
        summary: "Request an email verification token for the authenticated user.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": jsonResponse("Accepted verification request.", { $ref: "#/components/schemas/AcceptedResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/email-verification/complete": {
      post: {
        tags: ["Account"],
        summary: "Verify account email with a valid token.",
        requestBody: jsonRequestBody("#/components/schemas/CompleteEmailVerificationRequest"),
        responses: {
          "200": jsonResponse("Verified user.", {
            type: "object",
            required: ["user"],
            properties: { user: { $ref: "#/components/schemas/PublicUser" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/cvs": {
      get: {
        tags: ["CVs"],
        summary: "List owner-scoped CV metadata.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { $ref: "#/components/parameters/sortOrder" },
          { name: "parserStatus", in: "query", schema: { type: "string", enum: ["pending", "parsed", "failed"] } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "uploadedAt", "title"] } },
        ],
        responses: {
          "200": jsonResponse("CV list.", {
            type: "object",
            required: ["cvs", "pagination"],
            properties: {
              cvs: { type: "array", items: { $ref: "#/components/schemas/Cv" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["CVs"],
        summary: "Upload and parse a PDF or DOCX CV.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["cv"],
                properties: {
                  cv: { type: "string", format: "binary" },
                  title: { type: "string", maxLength: 160 },
                },
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Uploaded CV.", {
            type: "object",
            required: ["cv"],
            properties: { cv: { $ref: "#/components/schemas/Cv" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/cvs/{cvId}": {
      get: {
        tags: ["CVs"],
        summary: "Read an owner-scoped CV detail.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("cvId", "CV id.")],
        responses: {
          "200": jsonResponse("CV detail.", {
            type: "object",
            required: ["cv"],
            properties: { cv: { $ref: "#/components/schemas/Cv" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["CVs"],
        summary: "Delete an owner-scoped CV and dependent outputs.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("cvId", "CV id.")],
        responses: {
          "200": jsonResponse("Delete result.", { $ref: "#/components/schemas/DeleteResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/cvs/{cvId}/analyze": {
      post: {
        tags: ["Analyses"],
        summary: "Generate a CV analysis for an owned parsed CV.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("cvId", "CV id.")],
        responses: {
          "201": jsonResponse("Generated analysis.", {
            type: "object",
            required: ["analysis"],
            properties: { analysis: { $ref: "#/components/schemas/Analysis" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimit" },
          "502": { $ref: "#/components/responses/ProviderError" },
        },
      },
    },
    "/api/analyses": {
      get: {
        tags: ["Analyses"],
        summary: "List owner-scoped analyses.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { $ref: "#/components/parameters/sortOrder" },
          { name: "cvId", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "analyzedAt"] } },
        ],
        responses: {
          "200": jsonResponse("Analysis list.", {
            type: "object",
            required: ["analyses", "pagination"],
            properties: {
              analyses: { type: "array", items: { $ref: "#/components/schemas/Analysis" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/analyses/{analysisId}": {
      get: {
        tags: ["Analyses"],
        summary: "Read an owner-scoped analysis detail.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("analysisId", "Analysis id.")],
        responses: {
          "200": jsonResponse("Analysis detail.", {
            type: "object",
            required: ["analysis"],
            properties: { analysis: { $ref: "#/components/schemas/Analysis" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Analyses"],
        summary: "Delete an owner-scoped analysis.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("analysisId", "Analysis id.")],
        responses: {
          "200": jsonResponse("Delete result.", { $ref: "#/components/schemas/DeleteResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List owner-scoped job descriptions with literal case-insensitive search.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { $ref: "#/components/parameters/sortOrder" },
          { name: "search", in: "query", schema: { type: "string", maxLength: 120 } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "title", "company"] } },
        ],
        responses: {
          "200": jsonResponse("Job list.", {
            type: "object",
            required: ["jobs", "pagination"],
            properties: {
              jobs: { type: "array", items: { $ref: "#/components/schemas/JobDescription" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Jobs"],
        summary: "Create an owner-scoped pasted job description.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequestBody("#/components/schemas/CreateJobDescriptionRequest"),
        responses: {
          "201": jsonResponse("Created job.", {
            type: "object",
            required: ["job"],
            properties: { job: { $ref: "#/components/schemas/JobDescription" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "413": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/jobs/{jobId}": {
      get: {
        tags: ["Jobs"],
        summary: "Read an owner-scoped job description.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("jobId", "Job description id.")],
        responses: {
          "200": jsonResponse("Job detail.", {
            type: "object",
            required: ["job"],
            properties: { job: { $ref: "#/components/schemas/JobDescription" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Jobs"],
        summary: "Update an owner-scoped job description.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("jobId", "Job description id.")],
        requestBody: jsonRequestBody("#/components/schemas/UpdateJobDescriptionRequest"),
        responses: {
          "200": jsonResponse("Updated job.", {
            type: "object",
            required: ["job"],
            properties: { job: { $ref: "#/components/schemas/JobDescription" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Jobs"],
        summary: "Delete an owner-scoped job description and dependent outputs.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("jobId", "Job description id.")],
        responses: {
          "200": jsonResponse("Delete result.", { $ref: "#/components/schemas/DeleteResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/comparisons": {
      get: {
        tags: ["Comparisons"],
        summary: "List owner-scoped comparisons.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { $ref: "#/components/parameters/sortOrder" },
          { name: "cvId", in: "query", schema: { type: "string" } },
          { name: "jobDescriptionId", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "comparedAt", "fitScore"] } },
        ],
        responses: {
          "200": jsonResponse("Comparison list.", {
            type: "object",
            required: ["comparisons", "pagination"],
            properties: {
              comparisons: { type: "array", items: { $ref: "#/components/schemas/Comparison" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Comparisons"],
        summary: "Compare an owned parsed CV with an owned job description.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequestBody("#/components/schemas/CreateComparisonRequest"),
        responses: {
          "201": jsonResponse("Created comparison.", {
            type: "object",
            required: ["comparison"],
            properties: { comparison: { $ref: "#/components/schemas/Comparison" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimit" },
          "502": { $ref: "#/components/responses/ProviderError" },
        },
      },
    },
    "/api/comparisons/{comparisonId}": {
      get: {
        tags: ["Comparisons"],
        summary: "Read an owner-scoped comparison detail.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("comparisonId", "Comparison id.")],
        responses: {
          "200": jsonResponse("Comparison detail.", {
            type: "object",
            required: ["comparison"],
            properties: { comparison: { $ref: "#/components/schemas/Comparison" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Comparisons"],
        summary: "Delete an owner-scoped comparison and dependent documents.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("comparisonId", "Comparison id.")],
        responses: {
          "200": jsonResponse("Delete result.", { $ref: "#/components/schemas/DeleteResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/documents": {
      get: {
        tags: ["Documents"],
        summary: "List owner-scoped generated documents.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { $ref: "#/components/parameters/sortOrder" },
          { name: "type", in: "query", schema: { type: "string", enum: ["cover_letter"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["draft"] } },
          { name: "cvId", in: "query", schema: { type: "string" } },
          { name: "jobDescriptionId", in: "query", schema: { type: "string" } },
          { name: "comparisonId", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "generatedAt", "title"] } },
        ],
        responses: {
          "200": jsonResponse("Document list.", {
            type: "object",
            required: ["documents", "pagination"],
            properties: {
              documents: { type: "array", items: { $ref: "#/components/schemas/GeneratedDocument" } },
              pagination: { $ref: "#/components/schemas/Pagination" },
            },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/documents/cover-letter": {
      post: {
        tags: ["Documents"],
        summary: "Generate a cover letter draft from owned CV and job context.",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequestBody("#/components/schemas/CreateCoverLetterRequest"),
        responses: {
          "201": jsonResponse("Generated document.", {
            type: "object",
            required: ["document"],
            properties: { document: { $ref: "#/components/schemas/GeneratedDocument" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimit" },
          "502": { $ref: "#/components/responses/ProviderError" },
        },
      },
    },
    "/api/documents/{documentId}": {
      get: {
        tags: ["Documents"],
        summary: "Read an owner-scoped generated document detail.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("documentId", "Generated document id.")],
        responses: {
          "200": jsonResponse("Document detail.", {
            type: "object",
            required: ["document"],
            properties: { document: { $ref: "#/components/schemas/GeneratedDocument" } },
          }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Documents"],
        summary: "Update an owner-scoped generated document draft.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("documentId", "Generated document id.")],
        requestBody: jsonRequestBody("#/components/schemas/UpdateGeneratedDocumentRequest"),
        responses: {
          "200": jsonResponse("Updated document.", {
            type: "object",
            required: ["document"],
            properties: { document: { $ref: "#/components/schemas/GeneratedDocument" } },
          }),
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete an owner-scoped generated document.",
        security: [{ bearerAuth: [] }],
        parameters: [pathIdParameter("documentId", "Generated document id.")],
        responses: {
          "200": jsonResponse("Delete result.", { $ref: "#/components/schemas/DeleteResponse" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
} as const
