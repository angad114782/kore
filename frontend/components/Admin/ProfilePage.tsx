import React, { useState } from "react";
import { toast } from "sonner";
import { Mail, User, Lock, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { User as UserType, UserRole } from "../../types";
import { userService } from "../../services/userService";
import { useConfirm } from "../ui/ConfirmDialog";

interface ProfilePageProps {
  user: UserType;
  onProfileUpdate: (updatedUser: UserType) => void;
  onLogout: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onProfileUpdate,
  onLogout,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const { confirm, dialog: sessionDialog } = useConfirm();

  // Any signed-in user can sign out of their own other devices.
  const canManageSessions = true;

  const askToLogoutAllDevices = async (changeType: "email" | "password") => {
    if (!canManageSessions) return;

    const shouldLogoutAll = await confirm({
      title: "Sign out from all devices?",
      description: (
        <div className="space-y-2">
          <p>
            Your {changeType} was updated successfully. Do you want to log out
            of all devices where this account is signed in?
          </p>
          <p className="font-medium text-amber-700">
            This will also sign you out on this device, and you will need to
            sign in again.
          </p>
        </div>
      ),
      confirmText: "Log out all devices",
      cancelText: "Keep other sessions",
    });

    if (!shouldLogoutAll) return;

    const logoutPromise = userService.logoutAllSessions();
    toast.promise(logoutPromise, {
      loading: "Signing out all devices...",
      success: "All devices have been signed out",
      error: (err: any) => err.message || "Failed to sign out all devices",
    });

    try {
      await logoutPromise;
      onLogout();
    } catch {
      // toast.promise displays the failure while keeping the current session
      // available for the user to retry.
    }
  };

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!profileForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailChanged =
      profileForm.email.trim().toLowerCase() !== user.email.trim().toLowerCase();

    setLoading(true);
    const updatePromise = userService.updateProfile({
      name: profileForm.name,
      email: profileForm.email,
    });

    toast.promise(updatePromise, {
      loading: "Updating profile...",
      success: "Profile updated successfully",
      error: (err: any) => err.message || "Failed to update profile",
    });

    updatePromise
      .then(async (updatedUser) => {
        onProfileUpdate(updatedUser);
        setLoading(false);
        if (emailChanged) await askToLogoutAllDevices("email");
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.oldPassword) {
      toast.error("Old password is required");
      return;
    }

    if (!passwordForm.newPassword) {
      toast.error("New password is required");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    const changePromise = userService.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });

    toast.promise(changePromise, {
      loading: "Changing password...",
      success: "Password changed successfully",
      error: (err: any) => err.message || "Failed to change password",
    });

    changePromise
      .then(async () => {
        setPasswordForm({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setLoading(false);
        await askToLogoutAllDevices("password");
      })
      .catch(() => {
        setLoading(false);
      });
  };

  return (
    <>
      {sessionDialog}
      <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 mt-1">
            Manage your account settings and security
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* User Info */}
        <div className="flex items-center gap-5 px-8 py-6 border-b border-slate-200 bg-slate-50/40">
          <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
            <User size={26} className="text-indigo-600" />
          </div>

          <div>
            <h3 className="font-semibold text-lg text-slate-900">
              {user.name}
            </h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <div className="ml-auto">
            <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 capitalize">
              {user.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-4 font-semibold text-sm transition ${
              activeTab === "profile"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Profile Information
          </button>

          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-4 font-semibold text-sm transition ${
              activeTab === "password"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Security
          </button>
        </div>

        <div className="p-8">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-xl">
              {/* Name */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={profileForm.name}
                    disabled={loading}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={profileForm.email}
                    disabled={loading}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Save */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (profileForm.name === user.name &&
                      profileForm.email === user.email)
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  <Save size={18} />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* PASSWORD TAB */}
          {activeTab === "password" && (
            <form
              onSubmit={handlePasswordChange}
              className="space-y-6 max-w-xl"
            >
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
                Use a strong password with letters, numbers and symbols.
              </div>

              {/* Current Password */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Current Password
                </label>

                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  disabled={loading}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      oldPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  New Password
                </label>

                <input
                  type="password"
                  value={passwordForm.newPassword}
                  disabled={loading}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  disabled={loading}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                <Lock size={18} />
                {loading ? "Changing..." : "Change Password"}
              </button>
            </form>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default ProfilePage;
