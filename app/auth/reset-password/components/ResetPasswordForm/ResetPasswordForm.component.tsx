"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "@/lib/validations/auth";
import { Input } from "@/components/fields/Input";
import { Button } from "@/components/atoms/Button";
import styles from "./ResetPasswordForm.module.css";

type ResetPasswordFormProps = {
  className?: string;
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  className,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  // Exchange the code from the URL for a session on mount
  useEffect(() => {
    // Check for error in URL hash (e.g. expired link)
    const hash = window.location.hash
    if (hash.includes('error=')) {
      setSessionError(true)
      return
    }

    const code = searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("Failed to exchange code:", error);
          setSessionError(true);
        } else {
          setSessionReady(true);
        }
      });
    } else {
      // No code — check if there's already an active recovery session (hash-based flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        } else {
          setSessionError(true);
        }
      });
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      setSuccess(true);
      toast.success("Password updated successfully");
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err.message || "An error occurred");
    }
  };

  if (success) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Password updated</h2>
        <p className={styles.successText}>
          Your password has been reset. Redirecting to login...
        </p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className={styles.errorCard}>
        <h2 className={styles.errorTitle}>Link expired or invalid</h2>
        <p className={styles.errorText}>
          This reset link has expired or already been used. Please request a new
          one.
        </p>
        <Link href="/auth/forgot-password" className={styles.link}>
          Request new reset link
        </Link>
      </div>
    );
  }

  if (!sessionReady) {
    return <p className={styles.loading}>Verifying reset link...</p>;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={clsx(styles.form, className)}
    >
      <Input
        label="New Password"
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        placeholder="••••••••"
        helperText="At least 8 characters, with uppercase, lowercase and a number"
        error={errors.password?.message}
        {...register("password")}
      />

      <Input
        label="Confirm New Password"
        type="password"
        autoComplete="new-password"
        disabled={isSubmitting}
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" loading={isSubmitting} fullWidth>
        Set New Password
      </Button>

      <div className={styles.footer}>
        <Link href="/auth/login" className={styles.link}>
          ← Back to login
        </Link>
      </div>
    </form>
  );
};
