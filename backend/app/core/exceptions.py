from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class NexusException(Exception):
    """Base exception class for all domain-specific errors."""
    def __init__(self, status_code: int, error_code: str, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.error_code = error_code
        self.detail = detail


class MissingCaseReferenceError(NexusException):
    """Raised when case_reference form field is absent or empty."""
    def __init__(self, detail: str = "case_reference form field is required"):
        super().__init__(status_code=422, error_code="MISSING_CASE_REFERENCE", detail=detail)


class InvalidSchemaError(NexusException):
    """Raised when uploaded file columns or general payload format is invalid."""
    def __init__(self, detail: str = "File header or columns do not match expected schema"):
        super().__init__(status_code=400, error_code="INVALID_SCHEMA", detail=detail)


class UnknownTowerIdError(NexusException):
    """Raised when tower_id references in tower dump do not exist in metadata."""
    def __init__(self, detail: str = "One or more tower_id values do not exist in tower metadata"):
        super().__init__(status_code=400, error_code="UNKNOWN_TOWER_ID", detail=detail)


def register_exception_handlers(app: FastAPI) -> None:
    """Registers exception handlers for mapping domain and validation errors to structured responses."""
    
    @app.exception_handler(NexusException)
    async def nexus_exception_handler(request: Request, exc: NexusException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error_code, "detail": exc.detail}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Translate generic validation errors to clean errors
        errors = exc.errors()
        detail_msg = "; ".join([f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}" for err in errors])
        
        # Check if case_reference is the field that failed validation
        is_case_ref_missing = any("case_reference" in str(err["loc"]) for err in errors)
        
        if is_case_ref_missing:
            return JSONResponse(
                status_code=422,
                content={"error": "MISSING_CASE_REFERENCE", "detail": "case_reference form field is required"}
            )
        
        return JSONResponse(
            status_code=400,
            content={"error": "INVALID_SCHEMA", "detail": f"Validation error: {detail_msg}"}
        )
