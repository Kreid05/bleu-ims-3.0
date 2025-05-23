from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# routers
from routers import materials

app = FastAPI()

# include routers
app.include_router(materials.router, prefix='/materials', tags=['materials'])

# CORS setup to allow frontend and backend on ports
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
    uvicorn.run("main:app", port=8003, host="127.0.0.1", reload=True)