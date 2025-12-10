/**
 * DatePicker Component
 *
 * Custom date picker with full styling control using react-day-picker
 * Replaces native HTML5 date inputs for better design system integration
 */

"use client";

import { useId, useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import clsx from "clsx";
import { Calendar } from "lucide-react";
import "react-day-picker/dist/style.css";
import styles from "./DatePicker.module.css";

type DatePickerProps = {
  label: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  /** Dates that should be disabled (not selectable) */
  disabledDays?: Date | Date[] | ((date: Date) => boolean);
};

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
  className,
  disabledDays,
}) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const wrapperClasses = clsx(
    styles.wrapper,
    {
      [styles.fullWidth]: fullWidth,
      [styles.disabled]: disabled,
    },
    className
  );

  const inputClasses = clsx(styles.input, {
    [styles.disabled]: disabled,
    [styles.hasValue]: value,
  });

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displayValue = value ? format(value, "MMM dd, yyyy") : "";

  return (
    <div className={wrapperClasses}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      <div className={styles.inputContainer} ref={dropdownRef}>
        <div className={inputClasses} onClick={handleInputClick}>
          <span className={styles.inputText}>
            {displayValue || "Select date..."}
          </span>
          <Calendar className={styles.icon} size={18} />
        </div>

        {isOpen && !disabled && (
          <>
            {/* Mobile backdrop */}
            <div className={styles.backdrop} onClick={() => setIsOpen(false)} />

            <div className={styles.dropdown}>
              <DayPicker
                mode="single"
                selected={value}
                onSelect={handleSelect}
                showOutsideDays={false}
                disabled={disabledDays}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
