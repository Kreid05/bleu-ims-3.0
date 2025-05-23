from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List
import httpx
from database import get_db_connection

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="http://localhost:8000/auth/token")
router = APIRouter(prefix="/products", tags=["products"])

# model
class ProductOut(BaseModel):
    ProductID: int
    ProductName: str
    ProductTypeID: int
    ProductCategory: str
    ProductDescription: str
    ProductPrice: float
    ProductImage: str 

# auth
async def validate_token_and_roles(token: str, allowed_roles: List[str]):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/auth/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_data = response.json()
    if user_data.get("userRole") not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

# get products
@router.get("/", response_model=List[ProductOut])
async def get_all_products(token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "manager", "staff"])
    conn = await get_db_connection()
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM Products")
        rows = await cursor.fetchall()
        return [
            {
                "ProductID": row.ProductID,
                "ProductName": row.ProductName,
                "ProductTypeID": row.ProductTypeID,
                "ProductCategory": row.ProductCategory,
                "ProductDescription": row.ProductDescription,
                "ProductPrice": row.ProductPrice,
                "ProductImage": row.ProductImage
            }
            for row in rows
        ]

# create products
@router.post("/", response_model=ProductOut)
async def add_product(
    ProductName: str = Form(...),
    ProductTypeID: int = Form(...),
    ProductCategory: str = Form(...),
    ProductDescription: str = Form(...),
    ProductPrice: float = Form(...),
    ProductImage: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    await validate_token_and_roles(token, ["admin", "manager", "staff"])

    image_path = f"uploads/{ProductImage.filename}"
    with open(image_path, "wb") as f:
        f.write(await ProductImage.read())

    conn = await get_db_connection()
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 1 FROM Products
            WHERE ProductName COLLATE Latin1_General_CI_AS = ?
        """, ProductName)
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Product name already exists.")

        await cursor.execute("""
            INSERT INTO Products (ProductName, ProductTypeID, ProductCategory, ProductDescription, ProductPrice, ProductImage)
            OUTPUT INSERTED.*
            VALUES (?, ?, ?, ?, ?, ?)
        """, ProductName, ProductTypeID, ProductCategory, ProductDescription, ProductPrice, ProductImage.filename)

        row = await cursor.fetchone()
        return {
            "ProductID": row.ProductID,
            "ProductName": row.ProductName,
            "ProductTypeID": row.ProductTypeID,
            "ProductCategory": row.ProductCategory,
            "ProductDescription": row.ProductDescription,
            "ProductPrice": row.ProductPrice,
            "ProductImage": row.ProductImage
        }

# update products
@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    ProductName: str = Form(...),
    ProductTypeID: int = Form(...),
    ProductCategory: str = Form(...),
    ProductDescription: str = Form(...),
    ProductPrice: float = Form(...),
    ProductImage: UploadFile = File(None),
    token: str = Depends(oauth2_scheme)
):
    await validate_token_and_roles(token, ["admin", "manager", "staff"])

    image_filename = None
    if ProductImage:
        image_filename = ProductImage.filename
        with open(f"uploads/{image_filename}", "wb") as f:
            f.write(await ProductImage.read())

    conn = await get_db_connection()
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 1 FROM Products
            WHERE ProductName COLLATE Latin1_General_CI_AS = ?
              AND ProductID != ?
        """, ProductName, product_id)
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Product name already exists.")

        if image_filename:
            await cursor.execute("""
                UPDATE Products
                SET ProductName = ?, ProductTypeID = ?, ProductCategory = ?, ProductDescription = ?, ProductPrice = ?, ProductImage = ?
                WHERE ProductID = ?
            """, ProductName, ProductTypeID, ProductCategory, ProductDescription, ProductPrice, image_filename, product_id)
        else:
            await cursor.execute("""
                UPDATE Products
                SET ProductName = ?, ProductTypeID = ?, ProductCategory = ?, ProductDescription = ?, ProductPrice = ?
                WHERE ProductID = ?
            """, ProductName, ProductTypeID, ProductCategory, ProductDescription, ProductPrice, product_id)

        await cursor.execute("SELECT * FROM Products WHERE ProductID = ?", product_id)
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        return {
            "ProductID": row.ProductID,
            "ProductName": row.ProductName,
            "ProductTypeID": row.ProductTypeID,
            "ProductCategory": row.ProductCategory,
            "ProductDescription": row.ProductDescription,
            "ProductPrice": row.ProductPrice,
            "ProductImage": row.ProductImage
        }

# delete product
@router.delete("/{product_id}")
async def delete_product(product_id: int, token: str = Depends(oauth2_scheme)):
    await validate_token_and_roles(token, ["admin", "manager", "staff"])
    conn = await get_db_connection()
    async with conn.cursor() as cursor:
        await cursor.execute("DELETE FROM Products WHERE ProductID = ?", product_id)
    return {"message": "Product deleted successfully"}