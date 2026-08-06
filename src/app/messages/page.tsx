"use client";

import Mainlayout from "@/components/layout/Mainlayout";
import PlaceholderPage from "@/components/PlaceholderPage";
import { Mail } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function MessagesPage() {
  const { t } = useLanguage();
  return (
    <Mainlayout>
      <PlaceholderPage
        title={t("nav.messages")}
        icon={Mail}
      />
    </Mainlayout>
  );
}
