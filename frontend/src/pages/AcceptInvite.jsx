// src/pages/AcceptInvite.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "../api/axios";

const AcceptInvite = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          toast.error("Invalid invite link");
          navigate("/");
          return;
        }

        await axios.post("/business/accept-invite", { token });
        toast.success("Invite accepted! Welcome to the team 🎉");
        navigate("/home");
      } catch (err) {
        console.error(err);
        toast.error(
          err.response?.data?.message || "Failed to accept invite"
        );
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-lg">
      {loading ? "Accepting invite..." : "Redirecting..."}
    </div>
  );
};

export default AcceptInvite;
