from fastapi import APIRouter
from backend.app.api.v1.upload import router as upload_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.cases import router as cases_router
from backend.app.api.v1.suspects import router as suspects_router
from backend.app.api.v1.query import router as query_router

router = APIRouter()
router.include_router(upload_router, prefix="/upload", tags=["Upload"])
router.include_router(health_router, prefix="/health", tags=["Health"])
router.include_router(cases_router, prefix="/cases", tags=["Cases"])
router.include_router(suspects_router, prefix="/suspects", tags=["Suspects"])
router.include_router(query_router, prefix="/cases", tags=["Query"])
