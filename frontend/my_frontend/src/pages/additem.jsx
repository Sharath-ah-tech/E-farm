import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
// import { getMediaUrl } from "../utils/media";
import { addNotification } from "../utils/notification";
import {
  addProduct,
  addListing,
  applyDiscount,
  getProducts,
  getAllProducts,
} from "../api/product";

const UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "piece", label: "Piece" },
  { value: "litre", label: "Litre" },
  { value: "ml", label: "Millilitre (ml)" },
];

const CATEGORIES = [
  "Vegetables", "Fruits", "Tools", "Seeds", "Pesticide", "Greens",
];

const inputCls =
  "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 " +
  "text-gray-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
  "rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm";

function AddItem() {
  const navigate = useNavigate();
  const theme = getTheme();
  const role = localStorage.getItem("role")?.toLowerCase() || "customer";

  const [activeTab, setActiveTab] = useState("product");

  // ── Tab 1: Add Product ────────────────────────────────────────────────────
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Vegetables");
  const [pImage, setPImage] = useState(null);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState("");
  const [pSuccess, setPSuccess] = useState("");

  // ── Tab 2: Add Listing ────────────────────────────────────────────────────
  const [allProducts, setAllProducts] = useState([]);
  const [lProduct, setLProduct] = useState("");
  const [lPrice, setLPrice] = useState("");
  const [lStock, setLStock] = useState("");
  const [lUnit, setLUnit] = useState("kg");
  const [lDescription, setLDescription] = useState("");
  const [lLoading, setLLoading] = useState(false);
  const [lError, setLError] = useState("");
  const [lSuccess, setLSuccess] = useState("");

  // ── Tab 3: Listing Discount ───────────────────────────────────────────────
  const [myListings, setMyListings] = useState([]);
  // const [dLoading, setDLoading] = useState(false);

  // Fetch all parent products for the listing dropdown
  useEffect(() => {
    if (activeTab === "listing" && allProducts.length === 0) {
      getAllProducts()
        .then((r) => setAllProducts(r.data))
        .catch(console.error);
    }
    if (activeTab === "discount" && myListings.length === 0) {
      getProducts()
        .then((r) => setMyListings(r.data))
        .catch(console.error);
    }
  }, [activeTab, allProducts.length, myListings.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!pName.trim()) return;
    setPLoading(true);
    setPError("");
    setPSuccess("");
    try {
      const fd = new FormData();
      fd.append("name", pName);
      fd.append("category", pCategory);
      if (pImage) fd.append("image", pImage);
      await addProduct(fd);
      addNotification(
        `✅ Product "${pName}" created`,
        `Parent product added to the ${pCategory} category.`
      );
      setPSuccess(`Product "${pName}" created! Now add a listing for it.`);
      setPName("");
      setPCategory("Vegetables");
      setPImage(null);
      // Also refresh allProducts for listing tab
      setAllProducts([]);
    } catch (err) {
      setPError(err.response?.data?.name?.[0] || "Failed to create product.");
    } finally {
      setPLoading(false);
    }
  };

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!lProduct || !lPrice || !lStock) {
      setLError("Please fill in all required fields.");
      return;
    }
    setLLoading(true);
    setLError("");
    setLSuccess("");
    try {
      await addListing({
        product: Number(lProduct),
        price: lPrice,
        stock: lStock,
        units: lUnit,
        description: lDescription,
      });
      const prod = allProducts.find((p) => String(p.id) === String(lProduct));
      addNotification(
        `📦 Listing created for "${prod?.name}"`,
        `Price ₹${lPrice}, Stock: ${lStock} ${lUnit}`
      );
      setLSuccess(`Listing created successfully for ${prod?.name}!`);
      setLPrice("");
      setLStock("");
      setLDescription("");
    } catch (err) {
      const detail = err.response?.data;
      if (detail?.non_field_errors) {
        setLError("You already have a listing for this product. Edit it from your profile.");
      } else {
        setLError("Failed to create listing. Check the fields and try again.");
      }
    } finally {
      setLLoading(false);
    }
  };

  const handleDiscount = async (listingId, discount, listingName) => {
    try {
      await applyDiscount(listingId, { discount });
      addNotification(
        `🏷️ ${discount}% discount applied to "${listingName}"`,
        "Customers will see the discounted price."
      );
    } catch (err) {
      console.error(err);
      addNotification("❌ Failed to apply discount");
    }
  };

  const TABS = [
    { key: "product", label: "Add Product", icon: "add_circle" },
    { key: "listing", label: "Add Listing", icon: "inventory_2" },
    { key: "discount", label: "Listing Discount", icon: "local_offer" },
  ];

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div
          className={`${theme.card} rounded-3xl shadow-xl border ${theme.border} overflow-hidden`}
        >
          {/* Header */}
          <div className={`px-8 pt-8 pb-4`}>
            <h1 className={`text-2xl font-black ${theme.text}`}>
              Manage Products
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create products, add your listings, and manage discounts.
            </p>
          </div>

          {/* Tabs */}
          <div className="px-8 flex gap-2 border-b border-gray-100 dark:border-slate-800 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
                  activeTab === tab.key
                    ? `border-current ${theme.text}`
                    : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-8 py-6">
            {/* ── Tab 1: Add Product ── */}
            {activeTab === "product" && (
              <div>
                <div
                  className={`mb-5 p-4 rounded-xl border ${theme.border} ${theme.secondary}`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-bold">Step 1:</span> Create a parent
                    product once (e.g., "Tomato"). Multiple sellers can then add
                    their own listing for the same product.
                  </p>
                </div>

                {pError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl">
                    {pError}
                  </div>
                )}
                {pSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl">
                    {pSuccess}
                  </div>
                )}

                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tomato, Wheat Seeds, Garden Spade…"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                      Category *
                    </label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className={inputCls}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                      Product Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPImage(e.target.files[0])}
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pLoading}
                    className={`w-full ${theme.primary} text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60`}
                  >
                    {pLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">
                          add_circle
                        </span>
                        Create Product
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Tab 2: Add Listing ── */}
            {activeTab === "listing" && (
              <div>
                <div
                  className={`mb-5 p-4 rounded-xl border ${theme.border} ${theme.secondary}`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-bold">Step 2:</span> Choose an
                    existing product and add YOUR listing with your own price,
                    stock, and unit. Customers will see all sellers for the same
                    product and can choose who to buy from.
                  </p>
                </div>

                {lError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl">
                    {lError}
                  </div>
                )}
                {lSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl">
                    {lSuccess}
                  </div>
                )}

                {allProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                      inventory_2
                    </span>
                    <p className="text-gray-500 text-sm">
                      No products found. Create a product first.
                    </p>
                    <button
                      onClick={() => setActiveTab("product")}
                      className={`mt-3 px-5 py-2 rounded-xl text-sm font-bold text-white ${theme.primary}`}
                    >
                      Go to Add Product
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAddListing} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Select Product *
                      </label>
                      <select
                        value={lProduct}
                        onChange={(e) => setLProduct(e.target.value)}
                        className={inputCls}
                        required
                      >
                        <option value="">— Choose a product —</option>
                        {allProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="2.5"
                          placeholder="e.g. 50.00"
                          value={lPrice}
                          onChange={(e) => setLPrice(e.target.value)}
                          className={inputCls}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                          Stock *
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 100"
                          value={lStock}
                          onChange={(e) => setLStock(e.target.value)}
                          className={inputCls}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Unit *
                      </label>
                      <select
                        value={lUnit}
                        onChange={(e) => setLUnit(e.target.value)}
                        className={inputCls}
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe your product quality, harvesting method, freshness…"
                        value={lDescription}
                        onChange={(e) => setLDescription(e.target.value)}
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={lLoading}
                      className={`w-full ${theme.primary} text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60`}
                    >
                      {lLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating Listing…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">
                            inventory_2
                          </span>
                          Add My Listing
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── Tab 3: Listing Discount ── */}
            {activeTab === "discount" && (
              <div>
                <div
                  className={`mb-5 p-4 rounded-xl border ${theme.border} ${theme.secondary}`}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Apply percentage discounts to your listings. Discounts are
                    shown to all customers and trigger notifications.
                  </p>
                </div>

                {myListings.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                      local_offer
                    </span>
                    <p className="text-gray-500 text-sm">
                      You have no listings yet.
                    </p>
                    <button
                      onClick={() => setActiveTab("listing")}
                      className={`mt-3 px-5 py-2 rounded-xl text-sm font-bold text-white ${theme.primary}`}
                    >
                      Add a Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {myListings.map((listing) => (
                      <DiscountCard
                        key={listing.id}
                        listing={listing}
                        theme={theme}
                        onApply={handleDiscount}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscountCard({ listing, theme, onApply }) {
  const [discount, setDiscount] = useState("");
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleApply = async () => {
    const d = parseInt(discount, 10);
    if (isNaN(d) || d < 0 || d > 100) return;
    setApplying(true);
    try {
      await onApply(listing.id, d, listing.product_name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border ${theme.border} ${theme.card} shadow-sm`}
    >
      <img
        src={listing.product_image || "/vite.svg"}
        alt={listing.product_name}
        className="w-16 h-16 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
        onError={(e) => {
          e.target.src = "/vite.svg";
        }}
      />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white truncate">
          {listing.product_name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ₹{listing.price} / {listing.units} · Stock: {listing.stock}
        </p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <input
            type="number"
            min="0"
            max="100"
            placeholder="% discount"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-28 rounded-xl px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            onClick={handleApply}
            disabled={applying || !discount}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 ${
              success
                ? "bg-green-500"
                : `${theme.primary} hover:shadow-md`
            }`}
          >
            {applying ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : success ? (
              "✓ Applied!"
            ) : (
              "Apply"
            )}
          </button>
          {listing.stock === 0 && (
            <span className="text-xs text-red-500 font-semibold">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddItem;