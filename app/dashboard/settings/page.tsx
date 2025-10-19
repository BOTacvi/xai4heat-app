/**
 * Settings Page - Redirect to /settings/user
 *
 * This page redirects to the User Settings sub-page by default
 */

import { redirect } from "next/navigation";

type SettingsPageProps = {};

const SettingsPage: React.FC<SettingsPageProps> = async () => {
  redirect("/dashboard/settings/user");
};

export default SettingsPage;
