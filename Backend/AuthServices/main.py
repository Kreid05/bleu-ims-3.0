from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

# routers
from routers import auth, employee_accounts

app = FastAPI()

# include routers
app.include_router(auth.router, prefix='/auth', tags=['auth'])
app.include_router(employee_accounts.router, prefix='/employee-accounts', tags=['employee-accounts'])


# CORS setup to allow frontend and backend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # frontend
        "http://192.168.100.10:3000",  # frontend (local network)
        "http://127.0.0.1:8001",  # product service
        "http://localhost:8001",
        "http://127.0.0.1:8002", # ingredients service
        "http://localhost:8002", 
        "http://127.0.0.1:8003", # materials service
        "http://localhost:8003", 
        "http://127.0.0.1:8004", # merchandise service
        "http://localhost:8004", 
        "http://127.0.0.1:8005", # recipe management service
        "http://localhost:8005",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
UPLOAD_DIR_NAME = "uploads" # match directory name used in users.py
os.makedirs(UPLOAD_DIR_NAME, exist_ok=True) 
app.mount(f"/{UPLOAD_DIR_NAME}", StaticFiles(directory=UPLOAD_DIR_NAME), name=UPLOAD_DIR_NAME)

# run app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=8000, host="127.0.0.1", reload=True)