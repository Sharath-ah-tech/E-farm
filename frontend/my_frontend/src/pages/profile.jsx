import { useEffect, useState } from "react";
import { getMediaUrl } from "../utils/media";
import api from "../api/axios";
import {getProfile,getFarmerDashboard,getWholesalerDashboard,getCustomerDashboard,} from "../api/profile";
import { addNotification } from "../utils/notification";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({products: 0,revenue: 0,sales: 0,purchases: 0,topSelling: "",orders: 0,spending: 0,});
  const [selectedImage, setSelectedImage] =useState(null);
  const [loading, setLoading] =useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileRes =
        await getProfile();

      let userProfile = null;

if (profileRes.data.results) {
  userProfile =
    profileRes.data.results[0];
}
else if (
  Array.isArray(profileRes.data)
) {
  userProfile =
    profileRes.data[0];
}
else {
  userProfile =
    profileRes.data;
}

console.log(
  "USER PROFILE:",
  userProfile
);
        console.log("PROFILE RESPONSE:", profile);
console.log("LOADING:", loading);
      if (!userProfile) {
        setLoading(false);
        return;
      }

      setProfile(userProfile);

      const role =
        userProfile.role?.toLowerCase();

      if (role === "farmer") {
        const res =
          await getFarmerDashboard();

        setStats({
          products:res.data.total_products || 0,
          revenue:res.data.net_revenue || 0,
          sales:res.data.sales || 0,
          purchases:res.data.purchases || 0,
          topSelling:res.data.top_selling ||"No Sales",
          orders: 0,
          spending: 0,
        });
      }

      else if (
        role === "wholesaler"
      ) {
        const res =
          await getWholesalerDashboard();

        setStats({
          products:res.data.total_products || 0,
          revenue:res.data.net_revenue || 0,
          sales:res.data.sales || 0,
          purchases:res.data.purchases || 0,
          topSelling:res.data.top_selling ||"No Sales",
          orders: 0,
          spending: 0,
        });
      }

      else if (
        role === "customer"
      ) {
        const res =
          await getCustomerDashboard();

        setStats({products: 0,revenue: 0,sales: 0,purchases: 0,topSelling: "",orders:res.data.total_orders || 0,
          spending:res.data.spending || 0,});
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async () => {
    try {
      if (!selectedImage) return;

      const formData =
        new FormData();

      formData.append("image",selectedImage);

      await api.patch(`/profile/${profile.id}/`,formData,
        {headers: {"Content-Type":"multipart/form-data",},});

      await loadProfile();

      setSelectedImage(null);

      addNotification("Profile photo updated successfully");
    } catch (err) {
      console.log(err);
      alert("Failed to update profile photo");
    }
  };

  const revenueColor =
    stats.revenue > 0
      ? "text-green-600"
      : stats.revenue < 0
      ? "text-red-600"
      : "text-gray-500";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }
  console.log("PROFILE RESPONSE:", profile);
console.log("LOADING:", loading);   
  if (!profile) {
    return (
      <div className="text-center mt-20">
        Profile Not Found
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">

      {/* Cover */}
      <div className="h-48 rounded-b-3xl bg-gradient-to-r from-green-600 via-lime-500 to-emerald-600" />

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 -mt-20">

        {/* Profile Section */}
        <div className="flex flex-col md:flex-row gap-8 items-center">

  <div className="flex flex-col items-center">

    <img
      src={
        profile.image
          ? getMediaUrl(profile.image)
          : "/vite.svg"
      }
      alt="Profile"
      className="w-40 h-40 rounded-full border-4 border-green-500 object-cover"
      onError={(e) => {
        e.currentTarget.src = "/vite.svg";
      }}
    />

    <label
      htmlFor="profileImage"
      className="
        mt-4
        cursor-pointer
        bg-green-600
        hover:bg-green-700
        text-white
        px-4
        py-2
        rounded-lg
      "
    >
      Choose Photo
    </label>

    <input
      id="profileImage"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) =>
        setSelectedImage(
          e.target.files[0]
        )
      }
    />

    {selectedImage && (
      <button
        onClick={uploadImage}
        className="
          mt-2
          bg-blue-600
          hover:bg-blue-700
          text-white
          px-4
          py-2
          rounded-lg
        "
      >
        Save Photo
      </button>
    )}

  </div>

  <div>

    <h1 className="text-4xl font-bold">
      {profile.username}
    </h1>

    <div className="inline-block mt-2 px-4 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
      {profile.role}
    </div>

    <p className="mt-4 text-lg">
      📍 {profile.address || "No address added"}
    </p>

    {profile.profile_url && (
      <a
        href={profile.profile_url}
        target="_blank"
        rel="noreferrer"
        className="text-blue-500 hover:underline"
      >
        {profile.profile_url}
      </a>
    )}

  </div>

</div>

        {/* Dashboard Stats */}

        {(profile.role ===
          "farmer" ||
          profile.role ===
            "wholesaler") && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-10">

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3 className="text-gray-500">
                Products Listed
              </h3>

              <p className="text-4xl font-bold text-green-600">
                {
                  stats.products
                }
              </p>
            </div>

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3 className="text-gray-500">
                Profit / Loss
              </h3>

              <p
                className={`text-4xl font-bold ${revenueColor}`}
              >
                ₹
                {
                  stats.revenue
                }
              </p>
            </div>

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3 className="text-gray-500">
                Sales
              </h3>

              <p className="text-2xl font-bold text-green-600">
                ₹{stats.sales}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3 className="text-gray-500">
                Purchases
              </h3>

              <p className="text-2xl font-bold text-red-500">
                ₹
                {
                  stats.purchases
                }
              </p>
            </div>

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3 className="text-gray-500">
                Top Selling
              </h3>

              <p className="font-bold text-lg">
                {
                  stats.topSelling
                }
              </p>
            </div>

          </div>
        )}

        {/* Customer Dashboard */}

        {profile.role ===
          "customer" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3>
                Total Orders
              </h3>

              <p className="text-4xl font-bold text-green-600">
                {
                  stats.orders
                }
              </p>
            </div>

            <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-2xl shadow">
              <h3>
                Total Spending
              </h3>

              <p className="text-4xl font-bold text-green-600">
                ₹
                {
                  stats.spending
                }
              </p>
            </div>

          </div>
        )}

        {/* About */}

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">
            About
          </h2>

          <div className="bg-gray-50 dark:bg-slate-800 p-5 rounded-2xl">
            <p>
              Welcome to E-Farm.
              This account belongs to a{" "}
              <strong>
                {profile.role}
              </strong>
              .
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;