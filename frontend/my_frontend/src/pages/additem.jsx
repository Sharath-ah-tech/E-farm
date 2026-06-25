import { useState, useEffect } from "react";
import { addProducts, getProducts, applyDiscount } from "../api/product";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getMediaUrl } from "../utils/media";
import { addNotification } from "../utils/notification";
function Audited() {
  const navigate = useNavigate();
  const theme = getTheme();

  const role =
    localStorage.getItem("role")?.toLowerCase() || "customer";

  const [activeTab, setActiveTab] = useState("product");

  // Product Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("kg");
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState('Vegetables')

  // Products
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeTab !== "discount") return;

    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await getProducts();

        if (isMounted) {
          setProducts(response.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("units", unit);
      formData.append("category", category);

      if (image) {
        formData.append("image", image);
      }

      await addProducts(formData);

      addNotification(`🟢 New ${category} product "${name}" added`);

      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setUnit("kg");
      setImage(null);

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

const handleDiscount = async (productId, discount) => {
  try {
    await applyDiscount(productId, {
      discount,
    });

    const product = products.find(
      (p) => p.id === productId
    );

    addNotification(
      `🏷️ ${discount}% discount applied to "${product?.name}"`
    );

    navigate("/home");
  } catch (err) {
    console.error(err);

    addNotification(
      `🔴 Failed to apply discount`
    );
  }
};

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-black ${theme.text}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
            </h1>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => setActiveTab("product")}
                className={`px-5 py-2 rounded-xl font-bold transition-all ${
                  activeTab === "product"
                    ? `${theme.primary} text-white shadow-lg`
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Add Product
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("discount")}
                className={`px-5 py-2 rounded-xl font-bold transition-all ${
                  activeTab === "discount"
                    ? `${theme.primary} text-white shadow-lg`
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Discount Products
              </button>
            </div>
          </div>

          {/* PRODUCT FORM */}
          {activeTab === "product" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-100 border border-red-300 text-red-600 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <input
                type="text"
                placeholder="Product Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
                required
              />

              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
                required
              />

              <input
                type="number"
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
                required
              />

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              >
                <option value="kg">Kilogram</option>
                <option value="g">Gram</option>
                <option value="piece">Piece</option>
                <option value="litre">Litre</option>
                <option value="ml">Millilitre</option>
              </select>
              <select 
                value = {category}
                onChange={(e)=>setCategory(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              >
                <option value='Vegetables'>Vegetables</option>
                <option value='Fruits'>Fruits</option>
                <option value='Tools'>Tools</option>
                <option value='Seeds'>Seeds</option>
                <option value='Pesticide'>Pesticide</option>
                <option value='Greens'>Greens</option>
              </select>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              />

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${theme.primary} text-white py-3 rounded-xl font-bold`}
              >
                {loading ? "Adding..." : "Add Product"}
              </button>
            </form>
          )}

          {/* DISCOUNT PRODUCTS */}
          {activeTab === "discount" && (
            <>
              {products.length === 0 ? (
                <div className="text-center py-20">
                  <h2 className="text-3xl font-bold text-slate-500 dark:text-slate-300">
                    No Products Available
                  </h2>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <DiscountCard
                      key={product.id}
                      product={product}
                      onApplyDiscount={handleDiscount}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscountCard({ product, onApplyDiscount, theme }) {
  const [discount, setDiscount] = useState("");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 shadow-lg overflow-hidden">
      <img
        src={getMediaUrl(product.image)}
        alt={product.name}
        className="w-full h-48 object-cover"
        onError={(e) => {
          e.currentTarget.src = "/vite.svg";
        }}
      />

      <div className="p-5">
        <h3 className={`text-xl font-bold ${theme.text}`}>
          {product.name}
        </h3>

        <p className="text-slate-500 dark:text-slate-300 mt-2">
          {product.description}
        </p>

        <div className="mt-4 space-y-1">
          <p>
            <strong>Price:</strong> ₹{product.price}
          </p>

          <p>
            <strong>Stock:</strong> {product.stock}
          </p>
        </div>

        {product.stock > 0 ? (
          <>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Discount %"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
            />

            <button
              onClick={() =>
                onApplyDiscount(product.id, discount)
              }
              className={`w-full mt-3 ${theme.primary} text-white py-2 rounded-lg font-bold`}
            >
              Apply Discount
            </button>
          </>
        ) : (
          <div className="mt-4 text-red-500 font-bold">
            Out Of Stock
          </div>
        )}
      </div>
    </div>
  );
}

export default Audited;
