import { useState } from "react";
import { Link } from "react-router-dom";
import { getMediaUrl } from "../utils/media";

function ProductCard({ product }) {
  const [liked, setLiked] = useState(false);

  const handleFavorite = () => {
    setLiked(!liked);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all w-52">
      
      {/* Product Image */}
      <div className="relative">
        <img
          src={getMediaUrl(product.image)}
          alt={product.name}
          className="w-full h-40 object-contain bg-gray-100 dark:bg-slate-800"
          onError={(e) => {
            e.currentTarget.src = "/vite.svg";
          }}
        />

        {/* Wishlist */}
        <span
          onClick={handleFavorite}
          className={`absolute top-2 right-2 material-symbols-outlined cursor-pointer text-3xl ${
            liked ? "text-red-500" : "text-gray-400"
          }`}
        >
          favorite
        </span>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h2 className="font-bold text-lg text-gray-800 dark:text-white">
          {product.name}
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
          {product.seller_count} Seller
          {product.seller_count !== 1 ? "s" : ""}
        </p>

        <div className="mt-2">
          <p className="text-xl font-bold text-green-600">
            From ₹{product.lowest_price}
          </p>

          <p className="text-yellow-500 text-sm mt-1">
            ⭐ {product.average_rating}
          </p>
        </div>

        <div className="mt-4">
          <Link
            to={`/product/${product.id}`}
            className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
          >
            View Sellers
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;