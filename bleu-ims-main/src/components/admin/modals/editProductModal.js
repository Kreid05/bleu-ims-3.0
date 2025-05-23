import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types'; 
import "./editProductModal.css";

const API_BASE_URL = "http://127.0.0.1:8001";
const getAuthToken = () => localStorage.getItem("access_token");

function EditProductModal({ product, onClose, onUpdate }) {
    // existing states
    const [productTypeID, setProductTypeID] = useState("");
    const [productName, setProductName] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [productPrice, setProductPrice] = useState("");
    const [productImage, setProductImage] = useState(null);
    const [productImagePreview, setProductImagePreview] = useState(null);

    const [productTypes, setProductTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [formErrors, setFormErrors] = useState({
        productTypeID: "",
        productName: "",
        productCategory: "",
        productPrice: "",
    });

    useEffect(() => {
        if (product) {
            setProductTypeID(String(product.productTypeID || ""));
            setProductName(product.productName || "");
            setProductCategory(product.productCategory || "");
            setProductDescription(product.productDescription || "");
            setProductPrice(product.productPrice ? String(product.productPrice) : "");
            setProductImagePreview(product.productImageURL || null); // assuming product has productImageURL property with image URL
        }
    }, [product]);

    // fetch product types
    useEffect(() => {
        const fetchProductTypes = async () => {
            const token = getAuthToken();
            if (!token) {
                setApiError("Authentication token not found. Please log in.");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/ProductType/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: "Failed to parse error from server" }));
                    throw new Error(errorData.detail || `Failed to fetch product types (${response.status})`);
                }
                const data = await response.json();
                setProductTypes(data);
            } catch (error) {
                console.error("Error fetching product types:", error);
                setApiError(error.message || "Could not fetch product types.");
            }
        };
        fetchProductTypes();
    }, []);

    const validateForm = () => {
        const newErrors = {};
        if (!productTypeID) newErrors.productTypeID = "Product Type is required";
        if (!productName.trim()) newErrors.productName = "Product Name is required";
        if (!productCategory.trim()) newErrors.productCategory = "Product Category is required";
        if (!productPrice.trim() || isNaN(productPrice) || Number(productPrice) < 0) newErrors.productPrice = "Valid Product Price is required";

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setProductImage(file);
        if (file) {
            setProductImagePreview(URL.createObjectURL(file));
        } else {
            setProductImagePreview(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        if (!validateForm()) {
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setApiError("Authentication token not found. Please log in again.");
            return;
        }

        setIsLoading(true);

        try {
            // If your API supports multipart/form-data for updating images, use FormData
            const formData = new FormData();
            formData.append("ProductTypeID", parseInt(productTypeID, 10));
            formData.append("ProductName", productName);
            formData.append("ProductCategory", productCategory);
            formData.append("ProductDescription", productDescription);
            formData.append("ProductPrice", productPrice);
            if (productImage) {
                formData.append("ProductImage", productImage);
            }

            const response = await fetch(`${API_BASE_URL}/products/products/${product.productID}`, { 
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    // 'Content-Type': 'multipart/form-data' --> DON'T set Content-Type explicitly with FormData
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `HTTP Error: ${response.status}` }));
                let errorMessage = `Failed to update product. Status: ${response.status};`;
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage += `\nDetails: ${errorData.detail.map(d => `${d.loc.join('.')} - ${d.msg}`).join('; ')}`;
                    } else {
                        errorMessage += `\nDetails: ${errorData.detail}`;
                    }
                }
                throw new Error(errorMessage);
            }

            const updatedProductFromServer = await response.json();
            onUpdate(updatedProductFromServer);
            onClose();
        } catch (error) {
            console.error("Error updating product:", error);
            setApiError(error.message || "An unexpected error occurred during update.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="editProduct-modal-overlay">
            <div className="editProduct-modal-container">
                <div className="editProduct-modal-header">
                    <h3>Edit Product</h3>
                    <span className="editProduct-close-button" onClick={onClose}>&times;</span>
                </div>
                {apiError && <p className="error-message" style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{apiError}</p>}
                <form className="editProduct-modal-form" onSubmit={handleSubmit} encType="multipart/form-data">
                    <label>
                        Product Type <span className="editProduct-required-asterisk">*</span>
                        <select
                            id="edit-productTypeID"
                            value={productTypeID}
                            onChange={(e) => {
                                setProductTypeID(e.target.value);
                                if (formErrors.productTypeID) setFormErrors(prev => ({ ...prev, productTypeID: "" }));
                            }}
                            className={formErrors.productTypeID ? "editProduct-error" : ""}
                        >
                            <option value="">Select Type</option>
                            {productTypes.map((type) => (
                                <option key={type.productTypeID} value={type.productTypeID}>
                                    {type.productTypeName}
                                </option>
                            ))}
                        </select>
                        {formErrors.productTypeID && <p className="editProduct-error-message">{formErrors.productTypeID}</p>}
                    </label>

                    <label>
                        Product Name <span className="editProduct-required-asterisk">*</span>
                        <input
                            id="edit-productName"
                            type="text"
                            value={productName}
                            onChange={(e) => {
                                setProductName(e.target.value);
                                if (formErrors.productName) setFormErrors(prev => ({ ...prev, productName: "" }));
                            }}
                            className={formErrors.productName ? "editProduct-error" : ""}
                        />
                        {formErrors.productName && <p className="editProduct-error-message">{formErrors.productName}</p>}
                    </label>

                    <label>
                        Category <span className="editProduct-required-asterisk">*</span>
                        <input
                            id="edit-productCategory"
                            type="text"
                            value={productCategory}
                            onChange={(e) => {
                                setProductCategory(e.target.value);
                                if (formErrors.productCategory) setFormErrors(prev => ({ ...prev, productCategory: "" }));
                            }}
                            className={formErrors.productCategory ? "editProduct-error" : ""}
                        />
                        {formErrors.productCategory && <p className="editProduct-error-message">{formErrors.productCategory}</p>}
                    </label>

                    <label>
                        Price <span className="editProduct-required-asterisk">*</span>
                        <input
                            id="edit-productPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productPrice}
                            onChange={(e) => {
                                setProductPrice(e.target.value);
                                if (formErrors.productPrice) setFormErrors(prev => ({ ...prev, productPrice: "" }));
                            }}
                            className={formErrors.productPrice ? "editProduct-error" : ""}
                        />
                        {formErrors.productPrice && <p className="editProduct-error-message">{formErrors.productPrice}</p>}
                    </label>

                    <label>
                        Description
                        <textarea
                            id="edit-productDescription"
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                        ></textarea>
                    </label>

                    <label>
                        Product Image
                        <input
                            id="edit-productImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {productImagePreview && (
                            <div style={{ marginTop: 8 }}>
                                <img
                                    src={productImagePreview}
                                    alt="Product Preview"
                                    style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 4, objectFit: "contain" }}
                                />
                            </div>
                        )}
                    </label>

                    <div className="editProduct-button-container">
                        <button type="submit" className="editProduct-submit-button" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="editProduct-cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

EditProductModal.propTypes = {
    product: PropTypes.shape({
        productID: PropTypes.number.isRequired,
        productName: PropTypes.string,
        productTypeID: PropTypes.any,
        productCategory: PropTypes.string,
        productDescription: PropTypes.string,
        productPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        productImageURL: PropTypes.string,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
};

export default EditProductModal;
