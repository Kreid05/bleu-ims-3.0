import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import "../admin/products.css";
import Sidebar from "../sidebar";
import { FaChevronDown, FaFolderOpen, FaEdit, FaArchive, FaFilePdf } from "react-icons/fa";
import DataTable from "react-data-table-component";
import ProductTypeModal from './modals/productTypeModal';
import AddProductModal from './modals/addProductModal';
import EditProductModal from './modals/editProductModal';
import ViewProductModal from './modals/viewProductModal';
import { exportProductsToPDF } from '../../utils/pdfExport';

const API_BASE_URL = "http://127.0.0.1:8001";
const getAuthToken = () => localStorage.getItem("access_token");
const DEFAULT_PROFILE_IMAGE = "https://media-hosting.imagekit.io/1123dd6cf5c544aa/screenshot_1746457481487.png?Expires=1841065483&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=kiHcXbHpirt9QHbMA4by~Kd4b2BrczywyVUfZZpks5ga3tnO8KlP8s5tdDpZQqinqOG30tGn0tgSCwVausjJ1OJ9~e6qPVjLXbglD-65hmsehYCZgEzeyGPPE-rOlyGJCgJC~GCZOu0jDKKcu2fefrClaqBBT3jaXoK4qhDPfjIFa2GCMfetybNs0RF8BtyKLgFGeEkvibaXhYxmzO8tksUKaLAMLbsPWvHBNuzV6Ar3mj~lllq7r7nrynNfdvbtuED7OGczSqZ8H-iopheAUhaWZftAh9tX2vYZCZZ8UztSEO3XUgLxMMtv9NnTei1omK00iJv1fgBjwR2lSqRk7w__";

function Products() {
    const currentDate = new Date().toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric",
    });

    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(null);
    const [productTypes, setProductTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [showProductTypeModal, setShowProductTypeModal] = useState(false);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [showEditProductModal, setShowEditProductModal] = useState(false);
    const [viewedProduct, setViewedProduct] = useState(null);
    const [editModalData, setEditModalData] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("nameAsc");
    const navigate = useNavigate();

    const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);
    const [loggedInUserDisplay, setLoggedInUserDisplay] = useState({ role: "User", name: "Current User" });

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                setLoggedInUserDisplay({
                    name: decodedToken.sub || "Current User",
                    role: decodedToken.role || "User"
                });
            } catch (error) {
                console.error("Error decoding token for display:", error);
            }
        }
    }, []);

    const handleView = (product) => {
        setViewedProduct(product);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSortChange = (e) => {
        setSortOption(e.target.value);
    };

    const sortProducts = (productsToSort) => {
        if (sortOption === "nameAsc") {
            return [...productsToSort].sort((a, b) => a.ProductName.localeCompare(b.ProductName));
        } else if (sortOption === "nameDesc") {
            return [...productsToSort].sort((a, b) => b.ProductName.localeCompare(a.ProductName));
        }
        return productsToSort;
    };

    const fetchProductTypes = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/ProductType/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch product types.");
            }
            const data = await response.json();
            setProductTypes(data);
            if (data.length > 0 && activeTab === null) {
                setActiveTab(data[0].productTypeID);
            }
        } catch (error) {
            console.error("Failed to fetch product types:", error);
            alert("Failed to fetch product types.");
        }
    }, [activeTab]);

    useEffect(() => {
        fetchProductTypes();
        fetchProducts();
    }, [fetchProductTypes]);

    const fetchProducts = async () => {
        const token = getAuthToken();
        if (!token) {
            alert("Authentication token not found.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/products/products/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error("Failed to fetch products.");
            }
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error("Error fetching products:", error);
            alert("Session expired or unauthorized. Please login again.");
        }
    };

    const handleEdit = (productFromRow) => {
        const normalizedProduct = {
            productID: productFromRow.ProductID,
            productTypeID: productFromRow.ProductTypeID,
            productName: productFromRow.ProductName,
            productCategory: productFromRow.ProductCategory,
            productDescription: productFromRow.ProductDescription,
            productPrice: productFromRow.ProductPrice,     
            productImage: productFromRow.ProductImage,     
        };
        setEditModalData(normalizedProduct);
        setShowEditProductModal(true);
    };

    const handleUpdateProduct = (updatedProductFromServer) => {
        setProducts((prevProducts) =>
            prevProducts.map((p) =>
                p.ProductID === updatedProductFromServer.ProductID ? updatedProductFromServer : p
            )
        );
        setShowEditProductModal(false);
        setEditModalData(null);
    };

    const handleDelete = (productIdToDelete) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this product?");
        if (confirmDelete) {
            setProducts((prevProducts) =>
                prevProducts.filter((p) => p.ProductID !== productIdToDelete)
            );

            fetch(`${API_BASE_URL}/products/products/${productIdToDelete}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${getAuthToken()}`,
                },
            })
            .then(response => {
                if (!response.ok) {
                    console.error("Failed to delete product on server:", response.status, response.statusText);
                    alert("Failed to delete product from server. Refreshing data.");
                    fetchProducts();
                }
            })
            .catch((error) => {
                console.error("Error deleting product:", error);
                alert("An error occurred while deleting the product. Refreshing data.");
                fetchProducts();
            });
        }
    };

    const columns = [
        { name: "NO.", selector: (_row, index) => index + 1, width: "5%" },
        {
            name: "PRODUCT IMAGE",
            cell: (row) => (
                <img
                    src={row.ProductImage || DEFAULT_PROFILE_IMAGE}
                    alt={row.ProductName}
                    style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
                />
            ),
            width: "15%",
            ignoreRowClick: true,
            allowOverflow: true,
        },
        { name: "PRODUCT NAME", selector: (row) => row.ProductName, sortable: true, width: "17%" },
        { name: "PRODUCT DESCRIPTION", selector: (row) => row.ProductDescription, wrap: true, width: "20%" },
        { name: "PRODUCT CATEGORY", selector: (row) => row.ProductCategory, wrap: true, width: "15%" },
        {
            name: "PRODUCT PRICE",
            selector: (row) => `₱${parseFloat(row.ProductPrice).toFixed(2)}`,
            sortable: true,
            width: "13%",
        },
        {
            name: "ACTIONS",
            cell: (row) => (
                <div className="action-buttons">
                    <button className="action-button view" onClick={() => handleView(row)}><FaFolderOpen /></button>
                    <button className="action-button edit" onClick={() => handleEdit(row)}><FaEdit /></button>
                    <button className="action-button delete" onClick={() => handleDelete(row.ProductID)}><FaArchive /></button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            width: "15%",
            center: true,
        },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/login');
    };

    return (
        <div className="products">
            <Sidebar />
            <div className="roles">
                <header className="header">
                    <div className="header-left">
                        <h2 className="page-title">Products</h2>
                    </div>
                    <div className="header-right">
                        <div className="header-date">{currentDate}</div>
                        <div className="header-profile">
                            <div className="profile-pic"style={{ backgroundImage: `url(${DEFAULT_PROFILE_IMAGE})` }}></div>
                            <div className="profile-info">
                                <div className="profile-role">Hi! I'm {loggedInUserDisplay.role}</div>
                                <div className="profile-name">{loggedInUserDisplay.name}</div>
                            </div>
                            <div className="dropdown-icon" onClick={toggleDropdown}><FaChevronDown /></div>
                            {isDropdownOpen && (
                                <div className="profile-dropdown">
                                    <ul>
                                        <li>Edit Profile</li>
                                        <li onClick={handleLogout}>Logout</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="product-header">
                    <div className="product-top-row">
                        {productTypes.map((type) => (
                            <button
                                key={type.productTypeID}
                                className={`product-tab-button ${activeTab === type.productTypeID ? "active" : ""}`}
                                onClick={() => setActiveTab(type.productTypeID)}
                            >
                                {type.productTypeName}
                            </button>
                        ))}
                    </div>
                    <div className="product-bottom-row">
                        <input 
                            type="text" 
                            className="product-search-box" 
                            placeholder="Search products..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <div className="sort-product-container">
                            <label htmlFor="sort-product">Sort by:</label>
                            <select 
                                id="sort-product" 
                                className="sort-product-select"
                                value={sortOption}
                                onChange={handleSortChange}
                            >
                                <option value="nameAsc">Newest</option>
                                <option value="nameDesc">Oldest</option>
                            </select>
                        </div>
                        <button className="add-product-button" onClick={() => setShowAddProductModal(true)}>
                            + Add Product
                        </button>
                        <button className="product-type-button" onClick={() => {
                            setShowProductTypeModal(true);
                        }}>
                            Product Type
                        </button>
                        <button 
                            className="export-pdf-button" 
                            onClick={() => {
                                const filteredProducts = activeTab !== null
                                    ? sortProducts(products.filter((product) => 
                                        product.ProductTypeID === activeTab && 
                                        product.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
                                    ))
                                    : sortProducts(products.filter((product) => 
                                        product.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
                                    ));
                                exportProductsToPDF(filteredProducts, columns.filter(col => col.name !== "ACTIONS"));
                            }}
                        >
                            <FaFilePdf /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="products-content">
                    <DataTable
                        columns={columns}
                        data={
                            activeTab !== null
                                ? sortProducts(products.filter((product) => 
                                    product.ProductTypeID === activeTab && 
                                    product.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
                                ))
                                : sortProducts(products.filter((product) => 
                                    product.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
                                ))
                        }
                        striped
                        highlightOnHover
                        responsive
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
                                    minHeight: "100px",
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {viewedProduct && (
                <ViewProductModal
                    product={viewedProduct}
                    onClose={() => setViewedProduct(null)}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                        handleDelete(id);
                        setViewedProduct(null);
                    }}
                />
            )}

            {showProductTypeModal && (
                <ProductTypeModal
                    onClose={() => setShowProductTypeModal(false)}
                    onProductTypeAdded={() => {
                        fetchProductTypes();
                        setShowProductTypeModal(false);
                    }}
                />
            )}

            {showAddProductModal && (
                <AddProductModal
                    productTypes={productTypes}
                    onClose={() => setShowAddProductModal(false)}
                    onSubmit={(newProductFromBackend) => {
                        setProducts((prevProducts) => [...prevProducts, newProductFromBackend]);
                    }}
                />
            )}

            {showEditProductModal && editModalData && (
                <EditProductModal
                    product={editModalData}
                    onClose={() =>  {
                        setShowEditProductModal(false);
                        setEditModalData(null);
                    }}
                    onUpdate={handleUpdateProduct}
                />
            )}
        </div>
    );
}

export default Products;