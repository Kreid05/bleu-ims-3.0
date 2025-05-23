from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import httpx
from pydantic import BaseModel
from database import get_db_connection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8000/auth/token")
router = APIRouter()

# models
class ProductTypeCreateRequest(BaseModel):
    productTypeName: str

class ProductTypeUpdateRequest(BaseModel):
    productTypeName: str

# auth check
async def verify_admin(token: str = Depends(oauth2_scheme)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/auth/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_data = response.json()
    if user_data.get('userRole') != 'admin':
        raise HTTPException(status_code=403, detail="Access denied")
    return True

# create product type
@router.post("/create")
async def create_product_type(
    request: ProductTypeCreateRequest,
    _: bool = Depends(verify_admin)
):
    conn = await get_db_connection()
    cursor = await conn.cursor()

    # duplicate check
    await cursor.execute("""
        SELECT 1 FROM ProductType 
        WHERE productTypeName COLLATE Latin1_General_CI_AS = ?
    """, request.productTypeName)
    if await cursor.fetchone():
        raise HTTPException(status_code=400, detail="Product type already exists")

    try:
        await cursor.execute(
            "INSERT INTO ProductType (productTypeName) VALUES (?)",
            (request.productTypeName,)
        )
        await conn.commit()
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Product type created successfully"}

# get product type
@router.get("/")
async def get_product_types(_: str = Depends(oauth2_scheme)):
    conn = await get_db_connection()
    cursor = await conn.cursor()

    await cursor.execute("SELECT productTypeID, productTypeName FROM ProductType")
    rows = await cursor.fetchall()

    await cursor.close()
    await conn.close()

    return [{"productTypeID": row[0], "productTypeName": row[1]} for row in rows]

# update product type
@router.put("/{product_type_id}")
async def update_product_type(
    product_type_id: int,
    request: ProductTypeUpdateRequest,
    _: bool = Depends(verify_admin)
):
    conn = await get_db_connection()
    cursor = await conn.cursor()

    # duplicate check
    await cursor.execute("""
        SELECT 1 FROM ProductType 
        WHERE productTypeName COLLATE Latin1_General_CI_AS = ? 
        AND productTypeID != ?
    """, (request.productTypeName, product_type_id))
    if await cursor.fetchone():
        raise HTTPException(status_code=400, detail="Product type already exists")

    await cursor.execute("SELECT 1 FROM ProductType WHERE productTypeID = ?", (product_type_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Product type not found")

    try:
        await cursor.execute(
            "UPDATE ProductType SET productTypeName = ? WHERE productTypeID = ?",
            (request.productTypeName, product_type_id)
        )
        await conn.commit()
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Product type updated successfully"}

# delete product type
@router.delete("/{product_type_id}")
async def delete_product_type(
    product_type_id: int,
    _: bool = Depends(verify_admin)
):
    conn = await get_db_connection()
    cursor = await conn.cursor()

    await cursor.execute("SELECT 1 FROM ProductType WHERE productTypeID = ?", (product_type_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Product type not found")

    try:
        await cursor.execute("DELETE FROM ProductType WHERE productTypeID = ?", (product_type_id,))
        await conn.commit()
    finally:
        await cursor.close()
        await conn.close()

    return {"message": "Product type deleted successfully"}