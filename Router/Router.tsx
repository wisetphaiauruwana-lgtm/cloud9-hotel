// src/Router/Router.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "../App";

/**
 * ❤️ Router นี้จะทำหน้าที่:
 * - mount App.tsx ทุกเส้นทาง
 * - ปล่อยให้ App.tsx อ่าน token จาก URL (เช่น /checkin?token=xxx)
 * - รองรับ deep-link เช่นลิงก์จากอีเมลเช็คอิน
 */

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* เส้นทางหลัก */}
        <Route path="/" element={<App />} />

        {/* เช็คอินผ่านอีเมล — App จะ handle ด้วย useLocation */}
        <Route path="/checkin" element={<App />} />

        {/* ใช้ fallback สำหรับทุกเส้นทางที่หาไม่เจอ */}
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
