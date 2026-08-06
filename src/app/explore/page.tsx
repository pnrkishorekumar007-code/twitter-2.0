"use client";

import Mainlayout from "@/components/layout/Mainlayout";
import PlaceholderPage from "@/components/PlaceholderPage";
import { Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ExplorePage() {
  const { t } = useLanguage();
  return (
    <Mainlayout>
      <PlaceholderPage
        title={t("nav.explore")}
        icon={Search}
      />
    </Mainlayout>
  );
}
