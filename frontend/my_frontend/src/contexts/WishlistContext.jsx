import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/axios";

// Every id is normalized to a string before it touches the Set/Map, so
// "5" and 5 are always the same key — this is the one thing that can
// make a per-product Set behave like a single shared boolean if it's
// inconsistent, so we pin it down here once and never again.
const norm = (id) => String(id);

const WishlistContext = createContext({
  wishlistedIds: new Set(),
  wishlistMap:   {},
  isWishlisted:  () => false,
  toggleWishlist: async () => {},
  loading: true,
  refresh: async () => {},
});

export function WishlistProvider({ children }) {
  // wishlistedIds: Set<string> of product IDs — the per-product source of truth.
  // wishlistMap:   { [productId: string]: wishlistEntryId } — needed for DELETE.
  const [wishlistedIds, setWishlistedIds] = useState(new Set());
  const [wishlistMap,   setWishlistMap]   = useState({});
  const [loading,       setLoading]       = useState(true);

  const hydrate = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setWishlistedIds(new Set());
      setWishlistMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("wishlist/");
      const data = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      const map = {};
      const ids = new Set();
      data.forEach((w) => {
        const lid = norm(w.listing);
        map[lid] = w.id;
        ids.add(lid);
      });
      setWishlistMap(map);
      setWishlistedIds(ids);
    } catch {
      setWishlistedIds(new Set());
      setWishlistMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    const onStorage = (e) => { if (e.key === "access") hydrate(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate]);

  // Looks up ONE product's own id in the Set — never a shared flag.
  const isWishlisted = useCallback(
    (listingId) => wishlistedIds.has(norm(listingId)),
    [wishlistedIds]
  );

  const toggleWishlist = useCallback(async (listingId) => {
    const lid = norm(listingId);
    const currentlyWishlisted = wishlistedIds.has(lid);

    // Optimistic update — flips ONLY this product's entry in the Set.
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      currentlyWishlisted ? next.delete(lid) : next.add(lid);
      return next;
    });

    try {
      if (currentlyWishlisted) {
        const entryId = wishlistMap[lid];
        if (entryId) {
          await api.delete(`wishlist/${entryId}/`);
          setWishlistMap((p) => {
            const next = { ...p };
            delete next[lid];
            return next;
          });
        }
      } else {
        const res = await api.post("wishlist/", { listing: listingId });
        setWishlistMap((p) => ({ ...p, [lid]: res.data.id }));
      }
      return true;
    } catch (err) {
      // Revert only this product's entry on failure.
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        currentlyWishlisted ? next.add(lid) : next.delete(lid);
        return next;
      });
      if (err.response?.status === 400 && !currentlyWishlisted) {
        hydrate(); // already exists server-side — resync instead of guessing
        return true;
      }
      return false;
    }
  }, [wishlistedIds, wishlistMap, hydrate]);

  return (
    <WishlistContext.Provider
      value={{ wishlistedIds, wishlistMap, isWishlisted, toggleWishlist, loading, refresh: hydrate }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);