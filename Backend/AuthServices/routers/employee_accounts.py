from fastapi import APIRouter, HTTPException, Depends, status, Form, UploadFile, File
from datetime import datetime, date
from database import get_db_connection 
from routers.auth import get_current_active_user, role_required 
import bcrypt
import shutil 
import os
from typing import Optional 

router = APIRouter()

# image upload config
UPLOAD_DIRECTORY = "uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True) 

@router.post('/create', dependencies=[Depends(role_required(["admin"]))])
async def create_user(
    fullName: str = Form(...),
    username: str = Form(...), 
    password: str = Form(...), 
    email: str = Form(...), 
    userRole: str = Form(...),
    phoneNumber: Optional[str] = Form(None),
    hireDate: Optional[date] = Form(None), 
    uploadImage: Optional[UploadFile] = File(None),

):
    if userRole not in ['admin', 'manager', 'staff']:
        raise HTTPException(status_code=400, detail="Invalid role")

    if not password.strip(): 
        raise HTTPException(status_code=400, detail="Password is required")
    
    if not username.strip():
            raise HTTPException(status_code=400, detail="Username is required")

    conn = None 
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()

        # check if full name already exists
        await cursor.execute("SELECT 1 FROM Users WHERE FullName = ? AND isDisabled = 0", (fullName,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Full name is already used")

        # check if email already exists
        await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND isDisabled = 0", (email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email is already used")

        # check if username already exists
        await cursor.execute("SELECT 1 FROM Users WHERE Username = ? AND isDisabled = 0", (username,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Username '{username}' is already taken.")

        # hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        image_filename_to_store = None
        if uploadImage:
            image_filename_to_store = f"{datetime.now().timestamp()}_{uploadImage.filename}"
            file_path = os.path.join(UPLOAD_DIRECTORY, image_filename_to_store)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(uploadImage.file, buffer)

        await cursor.execute('''
            INSERT INTO Users (FullName, Username, UserPassword, Email, UserRole, CreatedAt, isDisabled, UploadImage, PhoneNumber, HireDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (fullName, username, hashed_password, email, userRole, datetime.utcnow(), 0, image_filename_to_store, phoneNumber, hireDate))
        await conn.commit()

    except HTTPException: 
        raise
    except Exception as e:
        if uploadImage and 'image_filename_to_store' in locals() and image_filename_to_store and os.path.exists(os.path.join(UPLOAD_DIRECTORY, image_filename_to_store)):
            os.remove(os.path.join(UPLOAD_DIRECTORY, image_filename_to_store))
        print(f"Error in create_user: {e}") 
        raise HTTPException(status_code=500, detail=f"An internal server error occurred during user creation.")
    finally:
        if cursor:
            await cursor.close()
        if conn:
            await conn.close()

    return {'message': f'{userRole.capitalize()} created successfully!'}


@router.get('/list-employee-accounts', dependencies=[Depends(role_required(['admin']))])
async def list_users(
):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute(''' 
            SELECT UserID, FullName, Username, Email, UserRole, CreatedAt, UploadImage, PhoneNumber, HireDate
            FROM Users
            WHERE isDisabled = 0
        ''')
        users_db = await cursor.fetchall()
    except Exception as e:
        print(f"Error in list_users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user list.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    users_list = []
    for u in users_db:
        users_list.append({
            "userID": u[0], "fullName": u[1], "username": u[2], "email": u[3],
            "userRole": u[4], 
            "createdAt": u[5].isoformat() if u[5] else None,
            "uploadImage": u[6], "phoneNumber": u[7],
            "hireDate": u[8].isoformat() if u[8] else None,
        })
    return users_list


# update user
@router.put("/update/{user_id}", dependencies=[Depends(role_required(['admin']))])
async def update_user(
    user_id: int,
    fullName: Optional[str] = Form(None),
    password: Optional[str] = Form(None), 
    email: Optional[str] = Form(None),
    phoneNumber: Optional[str] = Form(None),
    hireDate: Optional[date] = Form(None),
    uploadImage: Optional[UploadFile] = File(None),
):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute("SELECT UploadImage, UserRole FROM Users WHERE UserID = ? AND isDisabled = 0", (user_id,))
        current_user_db_info = await cursor.fetchone()
        if not current_user_db_info:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_image_filename = current_user_db_info[0]
        current_user_role = current_user_db_info[1] 

        updates = []
        values = []

        if fullName:
            updates.append('FullName = ?')
            values.append(fullName)

        if email:
            await cursor.execute("SELECT 1 FROM Users WHERE Email = ? AND UserID != ? AND isDisabled = 0", (email, user_id))
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already used by another user")
            updates.append('Email = ?')
            values.append(email)
        
        if password and current_user_role in ['admin', 'manager', 'staff']:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            updates.append('UserPassword = ?')
            values.append(hashed_password)  

        if phoneNumber is not None:
            updates.append('PhoneNumber = ?')
            values.append(phoneNumber)

        if hireDate:
            updates.append('HireDate = ?')
            values.append(hireDate) 
        
        new_image_filename_to_store = None
        if uploadImage:
            new_image_filename_to_store = f"{datetime.now().timestamp()}_{uploadImage.filename}"
            file_path = os.path.join(UPLOAD_DIRECTORY, new_image_filename_to_store)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(uploadImage.file, buffer)
            updates.append('UploadImage = ?')
            values.append(new_image_filename_to_store)

        if not updates:
             if not new_image_filename_to_store:
                return {'message': 'No fields to update'}

        values.append(user_id)

        await cursor.execute(f"UPDATE Users SET {', '.join(updates)} WHERE UserID = ? AND isDisabled = 0 ", tuple(values))
        await conn.commit()

        if new_image_filename_to_store and current_image_filename:
            old_image_path = os.path.join(UPLOAD_DIRECTORY, current_image_filename)
            if os.path.exists(old_image_path):
                os.remove(old_image_path)
                
    except HTTPException: raise
    except Exception as e:
        if uploadImage and 'new_image_filename_to_store' in locals() and new_image_filename_to_store and os.path.exists(os.path.join(UPLOAD_DIRECTORY, new_image_filename_to_store)):
            os.remove(os.path.join(UPLOAD_DIRECTORY, new_image_filename_to_store))
        print(f"Error in update_user: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during user update.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    return {'message': 'User updated successfully'}


# soft delete user
@router.delete('/delete/{user_id}', dependencies=[Depends(role_required(['admin']))])
async def delete_user(
    user_id: int,
):
    conn = None
    cursor = None
    try:
        conn = await get_db_connection()
        cursor = await conn.cursor()
        await cursor.execute("SELECT 1 FROM Users WHERE UserID = ? AND isDisabled = 0", (user_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found or already disabled.")
        await cursor.execute("UPDATE Users SET isDisabled = 1 WHERE UserID = ? ", (user_id,))
        await conn.commit()
    except HTTPException: raise
    except Exception as e:
        print(f"Error in delete_user: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during user deletion.")
    finally:
        if cursor: await cursor.close()
        if conn: await conn.close()

    return {'message': 'User soft deleted successfully'}