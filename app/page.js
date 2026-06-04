"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const loggedInUser = localStorage.getItem("sikad_logged_in_user");
    if (loggedInUser) {
      try {
        const user = JSON.parse(loggedInUser);
        if (user.role === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/dosen/dashboard");
        }
      } catch (err) {
        localStorage.removeItem("sikad_logged_in_user");
        router.replace("/login");
      }
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      background: "#060913",
      color: "#f3f4f6",
      fontFamily: "sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: "1rem" }}>Triesakti Institute of Airlines</h2>
        <p style={{ color: "#9ca3af" }}>Redirecting to login / dashboard...</p>
      </div>
    </div>
  );
}
