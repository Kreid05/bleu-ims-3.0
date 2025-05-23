import React, { useState, useEffect } from "react";
import "./productTypeModal.css";
import DataTable from "react-data-table-component";
import { FaEdit, FaArchive } from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8001/ProductType";
const getAuthToken = () => localStorage.getItem("access_token");

const ProductTypeModal = ({ onClose }) => {
    const [productTypes, setProductTypes] = useState([]);
    const [showAddFormModal, setShowAddFormModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [editTypeID, setEditTypeID] = useState(null);
    const [editTypeName, setEditTypeName] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchProductTypes();
    }, []);

    const fetchProductTypes = async () => {
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch product types.");
            }

            const data = await response.json();
            setProductTypes(data);
        } catch (error) {
            console.error("Error fetching product types:", error);
            alert("Failed to fetch product types.");
        }
    };

    const handleAddType = async () => {
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }

        if (newTypeName.trim() === "") {
            alert("Product type name cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ productTypeName: newTypeName }),
            });

            if (!response.ok) throw new Error("Failed to add product type.");

            setNewTypeName("");
            setShowAddFormModal(false);
            fetchProductTypes();
        } catch (error) {
            console.error("Error adding product type:", error);
            alert("Failed to add product type.");
        }
    };

    const handleEdit = (type) => {
        setEditTypeID(type.productTypeID);
        setEditTypeName(type.productTypeName);
        setIsEditing(true);
    };

    const handleUpdateType = async (e) => {
        e.preventDefault();
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }

        if (editTypeName.trim() === "") {
            alert("Product type name cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${editTypeID}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ productTypeName: editTypeName }),
            });

            if (!response.ok) throw new Error("Failed to update product type.");

            setIsEditing(false);
            setEditTypeID(null);
            setEditTypeName("");
            fetchProductTypes();
        } catch (error) {
            console.error("Error updating product type:", error);
            alert("Failed to update product type.");
        }
    };

    const handleDelete = async (typeId) => {
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }

        const confirmDelete = window.confirm("Are you sure you want to delete this product type?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/${typeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to delete product type.");

            setProductTypes((prev) => prev.filter((pt) => pt.productTypeID !== typeId));
        } catch (error) {
            console.error("Error deleting product type:", error);
            alert("Failed to delete product type.");
        }
    };

    const columns = [
        { name: "Product Type ID", selector: (row) => row.productTypeID, sortable: true },
        { name: "Name", selector: (row) => row.productTypeName, sortable: true },
        {
            name: "Actions",
            cell: (row) => (
                <>
                    <button onClick={() => handleEdit(row)} className="icon-button"><FaEdit /></button>
                    <button onClick={() => handleDelete(row.productTypeID)} className="icon-button"><FaArchive /></button>
                </>
            ),
        },
    ];

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Manage Product Types</h2>

                <button onClick={() => setShowAddFormModal(true)} className="button-primary">Add Product Type</button>

                <DataTable 
                    columns={columns} 
                    data={productTypes} 
                    pagination 
                    customStyles={{
                        headCells: {
                            style: {
                                backgroundColor: "#4B929D",
                                color: "#fff",
                                fontWeight: "600",
                                fontSize: "14px",
                                padding: "12px",
                                textTransform: "uppercase",
                                textAlign: "center",
                                letterSpacing: "1px",
                            },
                        },
                        rows: {
                            style: {
                                minHeight: "55px",
                            },
                        },
                    }}
                />

                {showAddFormModal && (
                    <div className="modal-overlay">
                        <div className="form-modal">
                            <h3>Add New Product Type</h3>
                            <input
                                type="text"
                                value={newTypeName}
                                onChange={(e) => setNewTypeName(e.target.value)}
                                placeholder="Enter type name"
                            />
                            <div className="modal-actions">
                                <button onClick={handleAddType} className="button-primary">Add</button>
                                <button onClick={() => setShowAddFormModal(false)} className="button-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {isEditing && (
                    <div className="modal-overlay">
                        <div className="form-modal">
                            <h3>Edit Product Type</h3>
                            <form onSubmit={handleUpdateType}>
                                <input
                                    type="text"
                                    value={editTypeName}
                                    onChange={(e) => setEditTypeName(e.target.value)}
                                    placeholder="Edit type name"
                                />
                                <div className="modal-actions">
                                    <button type="submit" className="button-primary">Update</button>
                                    <button onClick={() => setIsEditing(false)} className="button-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <button onClick={onClose} className="button-secondary" style={{ marginTop: "1em" }}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default ProductTypeModal;