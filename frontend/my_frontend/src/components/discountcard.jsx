import { useState } from "react";
import { getMediaUrl } from "../utils/media";

function DiscountCard({
  product,
  onApplyDiscount,
  theme,
}) {
  const [discount, setDiscount] = useState("");
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 shadow-lg overflow-hidden">
      {/* Product Image */}
      <img
        src={getMediaUrl(product.image)}
        alt={product.name}
        className="w-full h-32 object-contain bg-gray-50"
        onError={(e) => {
          e.currentTarget.src = "/vite.svg";
        }}
      />
      
      <div className="p-3">
        <h3 className={`text-lg font-bold ${theme.text}`}>
          {product.name}
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-2">
          {product.description}
        </p>

        <div className="mt-2 text-sm">
          <p>
            Price:
            <span className="font-bold ml-2">
              ₹{product.price}
            </span>
          </p>

          <p>
            Stock:
            <span className="font-bold ml-2">
              {product.stock}
            </span>
          </p>
        </div>

        {product.stock > 0 ? (
          <>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) =>
                setDiscount(e.target.value)
              }
              placeholder="Discount %"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
            />

            <button
              onClick={() =>
                onApplyDiscount(
                  product.id,
                  discount
                )
              }
              className={`w-full mt-3 ${theme.primary} text-white py-2 rounded-lg font-semibold`}
            >
              Apply Discount
            </button>
          </>
        ) : (
          <div className="mt-3 text-red-500 font-semibold text-sm">
            Out Of Stock
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscountCard;
