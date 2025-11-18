import React, { useEffect, useState } from "react";
import "./SystemTitle.css";

const SystemTitle: React.FC = () => {
  const [title, setTitle] = useState("Laundry Tambayan"); // default fallback

  useEffect(() => {
    const fetchSystemTitle = async () => {
      try {
        const response = await fetch("http://localhost/laundry_tambayan_pos_system_backend/get_settings.php");
        const data = await response.json();

        if (data.success && data.settings) {
          const systemTitleSetting = data.settings.find((s: any) => s.setting_name === "system_title");
          if (systemTitleSetting) {
            setTitle(systemTitleSetting.setting_value);
          }
        }
      } catch (error) {
        console.error("Failed to fetch system title:", error);
      }
    };

    fetchSystemTitle();
  }, []);

  return <div className="system-title">{title}</div>;
};

export default SystemTitle;
