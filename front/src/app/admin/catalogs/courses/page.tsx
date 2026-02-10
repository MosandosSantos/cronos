import { redirect } from "next/navigation";

export default function CatalogCoursesRedirectPage() {
  redirect("/admin/catalogs/trainings");
}
