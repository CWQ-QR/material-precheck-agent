import type { Metadata } from "next";
import { UploadForm } from "@/components/upload/upload-form";

export const metadata: Metadata = {
  title: "上传材料 - 材料一次过",
};

export default function UploadPage() {
  return <UploadForm />;
}
