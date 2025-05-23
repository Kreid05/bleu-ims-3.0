import React from "react";
import "./viewProductModal.css";
import { FaTimes, FaEdit, FaArchive } from "react-icons/fa";

const ViewProductModal = ({ product, onClose, onEdit, onDelete }) => {
    if (!product) return null;

    return (
        <div className="view-product-modal-overlay">
            <div className="view-product-modal">
                <button className="view-product-close-button" onClick={onClose}><FaTimes /></button>
                
                <h2 className="view-product-name">{product.ProductName}</h2>
                <hr className="view-product-divider" />

                <div className="view-product-modal-content">
                    <div className="view-product-category-label">Category</div>
                    <div className="view-product-category">{product.ProductCategory}</div>
                    
                    <div className="view-product-category-label">Description</div>
                    <div className="view-product-description">{product.ProductDescription}</div>
                </div>

                <div className="view-product-modal-actions">
                    <button className="view-product-modal-edit-button" onClick={() => onEdit(product)}><FaEdit /> Edit</button>
                    <button className="view-product-modal-delete-button" onClick={() => onDelete(product.ProductID)}><FaArchive /> Delete</button>
                </div>
            </div>
        </div>
    );
};

export default ViewProductModal;