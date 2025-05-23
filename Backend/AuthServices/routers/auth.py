from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import aioodbc
from database import get_db_connection  

# jwt config
SECRET_KEY = "15882913506880857248f72d1dbc38dd7d2f8f352786563ef5f23dc60987c632"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter()

# models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class User(BaseModel):
    username: str
    userRole: str
    disabled: bool | None = None

class UserInDB(User):
    hashed_password: str

# hass password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# get users 
async def get_users_from_db(username: str):
    conn = await get_db_connection()
    cursor = await conn.cursor()
    await cursor.execute(
        '''SELECT Username, UserPassword, UserRole, isDisabled FROM Users WHERE Username = ?''',
        (username,)
    )
    user_rows = await cursor.fetchall()
    await conn.close()

    users = []
    for row in user_rows:
        users.append(UserInDB(
            username=row[0],
            hashed_password=row[1],
            userRole=row[2],
            disabled=row[3] == 1
        ))
    return users

# hass pass
def get_password_hash(password: str):
    return pwd_context.hash(password)

# ensure admin exists on startup
async def create_admin_user():
    admin_user = await get_users_from_db('admin')
    if not admin_user:
        hashed_password = get_password_hash('admin123')
        conn = await get_db_connection()
        cursor = await conn.cursor()
        try:
            await cursor.execute(
                '''INSERT INTO Users (FullName, Username, UserPassword, UserRole, isDisabled) 
                   VALUES (?, ?, ?, ?, ?)''',
                ('Admin User', 'admin', hashed_password, 'admin', 0)
            )
            await conn.commit()
            print("Admin user created.")
        finally:
            await cursor.close()
            await conn.close()
    else:
        print("Admin user already exists.")

@router.on_event("startup")
async def on_startup():
    await create_admin_user()

# verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# authenticate user
async def authenticate_user(username: str, password: str):
    users = await get_users_from_db(username)
    for user in users:
        if verify_password(password, user.hashed_password):
            return user
    return None

# create jwt token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# get current user from token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credential_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credential_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credential_exception

    users = await get_users_from_db(token_data.username)
    if not users:
        raise credential_exception

    return users[0]

# validate active user
async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# role-based access control
def role_required(required_roles: list[str]):
    async def role_checker(current_user: UserInDB = Depends(get_current_active_user)):
        if current_user.userRole not in required_roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user
    return role_checker

# get current user info
@router.get("/users/me", response_model=User)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    return current_user

# login endpoint — returns jwt token
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    print("Attempting to authenticate user:", form_data.username)
    
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        print("Authentication failed for user:", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.userRole},
        expires_delta=access_token_expires
    )
    
    print("Authentication successful for:", user.username)
    return {"access_token": access_token, "token_type": "bearer"}

# admin-only test endpoint
@router.get("/admin-only-route", dependencies=[Depends(role_required(["admin"]))])
async def admin_only_route():
    return {"message": "This is restricted to admins only"}
