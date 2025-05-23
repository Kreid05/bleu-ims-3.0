from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# routers
from routers import ProductType
from routers import products

app = FastAPI()

# include routers
app.include_router(ProductType.router, prefix='/ProductType', tags=['product type'])
app.include_router(products.router, prefix = '/products' , tags=['products'])

# CORS setup to allow React frontend and backend on ports 8000 and 8001
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # frontend
        "http://192.168.100.10:3000",  # frontend (local network)
        "http://127.0.0.1:8000",  # auth service
        "http://localhost:8000",  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# run app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=8001, host="127.0.0.1", reload=True)